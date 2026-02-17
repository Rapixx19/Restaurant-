import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature } from '@/lib/payments/stripe';
import { updateOrderPaymentStatus } from '@/lib/orders/service';
import { sendOrderConfirmation } from '@/lib/notifications';
import { createLogger } from '@/lib/logging/server';
import { formatBillingAmount } from '@/lib/utils/currency';
import type Stripe from 'stripe';

const logger = createLogger('StripeWebhook');

// Supabase admin client for database operations
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Handle subscription creation or update.
 * Links user to organization with correct plan.
 */
async function handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
  const supabase = getSupabase();
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const status = subscription.status;

  logger.info('Subscription change', { customerId, priceId, status });

  // Find the plan by Stripe price ID
  const { data: plan } = await supabase
    .from('plan_configs')
    .select('id, name')
    .eq('stripe_price_id', priceId)
    .single();

  if (!plan) {
    logger.error('No plan found for price ID', { priceId });
    return;
  }

  // Map Stripe status to our status
  const mappedStatus = mapSubscriptionStatus(status);

  // Update or create organization
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (existingOrg) {
    // Update existing organization
    await supabase
      .from('organizations')
      .update({
        plan_id: plan.id,
        stripe_subscription_id: subscription.id,
        subscription_status: mappedStatus,
      })
      .eq('id', existingOrg.id);

    logger.info('Updated organization plan', { organizationId: existingOrg.id, planName: plan.name });
  } else {
    // Look up customer to get user ID from metadata
    logger.warn('No organization found for customer', { customerId });
  }
}

/**
 * Handle successful checkout session for subscription.
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const supabase = getSupabase();

  // Check if this is a subscription checkout
  if (session.mode !== 'subscription') {
    return;
  }

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const userId = session.metadata?.user_id;
  const organizationId = session.metadata?.organization_id;

  if (!userId) {
    logger.error('No user_id in session metadata');
    return;
  }

  logger.info('Checkout completed', { customerId, subscriptionId, userId, organizationId });

  // Get subscription details to find the plan
  // Note: We'd need to call Stripe API to get subscription details
  // For now, we'll rely on the subscription.created event

  if (organizationId) {
    // Update existing organization with Stripe details
    await supabase
      .from('organizations')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_status: 'active',
      })
      .eq('id', organizationId);

    logger.info('Linked organization to Stripe', { organizationId });
  } else {
    // Check if user already has an organization
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', userId)
      .single();

    if (existingOrg) {
      // Update existing organization
      await supabase
        .from('organizations')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: 'active',
        })
        .eq('id', existingOrg.id);

      logger.info('Linked existing organization to Stripe', { organizationId: existingOrg.id });
    }
  }
}

/**
 * Handle subscription deletion/cancellation.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const supabase = getSupabase();
  const customerId = subscription.customer as string;

  // Find organization by customer ID
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!org) {
    logger.warn('No organization found for canceled subscription', { customerId });
    return;
  }

  // Get the free plan
  const { data: freePlan } = await supabase
    .from('plan_configs')
    .select('id')
    .eq('name', 'free')
    .single();

  // Downgrade to free plan
  await supabase
    .from('organizations')
    .update({
      plan_id: freePlan?.id || null,
      stripe_subscription_id: null,
      subscription_status: 'canceled',
    })
    .eq('id', org.id);

  // Log billing alert for subscription cancellation
  await supabase.from('billing_alerts').insert({
    organization_id: org.id,
    alert_type: 'subscription_canceled',
    severity: 'warning',
    title: 'Subscription Canceled',
    message: 'Your subscription has been canceled. You have been downgraded to the Free plan with limited features.',
    metadata: {
      subscription_id: subscription.id,
      canceled_at: subscription.canceled_at,
    },
  });

  logger.info('Organization downgraded to free', { organizationId: org.id });
}

/**
 * Map Stripe subscription status to our status.
 */
function mapSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete' {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
      return 'canceled';
    case 'trialing':
      return 'trialing';
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete';
    default:
      return 'active';
  }
}

/**
 * Stripe Webhook Handler
 *
 * CRITICAL SECURITY: This endpoint uses stripe.webhooks.constructEvent()
 * to verify the webhook signature. This prevents fake payment attacks.
 *
 * Never process a payment without verifying the signature first.
 *
 * Handles:
 * - Order payments (checkout.session.completed for orders)
 * - Subscription events (subscription creation, updates, cancellation)
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body as text for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      logger.error('Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // CRITICAL: Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(body, signature);
    } catch (err) {
      logger.error('Webhook signature verification failed', { error: err });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Handle subscription checkout
        if (session.mode === 'subscription') {
          await handleCheckoutSessionCompleted(session);
          break;
        }

        // Handle order payment checkout
        const orderId = session.metadata?.order_id;
        if (!orderId) {
          logger.error('No order_id in checkout session metadata');
          break;
        }

        // Update order to PAID status
        const success = await updateOrderPaymentStatus(
          orderId,
          'paid',
          session.payment_method_types?.[0] || 'card'
        );

        if (success) {
          logger.info('Order payment confirmed', { orderId });

          // Send confirmation notification (email + SMS)
          const notificationResult = await sendOrderConfirmation(orderId);
          logger.debug('Order confirmation notification sent', { orderId, result: notificationResult });
        } else {
          logger.error('Failed to update order status', { orderId });
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;

        if (orderId) {
          logger.info('Checkout session expired', { orderId });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logger.warn('Payment failed', { paymentIntentId: paymentIntent.id });
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        logger.info('Charge refunded', { paymentIntentId });
        break;
      }

      // ============================================================
      // SUBSCRIPTION EVENTS
      // ============================================================

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as { subscription?: string }).subscription;
        const customerId = invoice.customer as string;
        logger.info('Invoice paid', { invoiceId: invoice.id, subscriptionId });

        // Find organization and log successful renewal
        const supabase = getSupabase();
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (org && invoice.billing_reason === 'subscription_cycle') {
          // Only log for subscription renewals, not initial payments
          const amountPaid = invoice.amount_paid ? invoice.amount_paid / 100 : null;
          const formattedAmount = formatBillingAmount(amountPaid, invoice.currency || 'eur');
          await supabase.from('billing_alerts').insert({
            organization_id: org.id,
            alert_type: 'subscription_renewed',
            severity: 'info',
            title: 'Subscription Renewed',
            message: `Your subscription has been successfully renewed. Amount charged: ${formattedAmount}.`,
            stripe_event_id: event.id,
            stripe_invoice_id: invoice.id,
            amount_due: amountPaid,
            currency: invoice.currency || 'eur',
          });

          // Clear past_due status if it was set
          await supabase
            .from('organizations')
            .update({ subscription_status: 'active' })
            .eq('id', org.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        logger.warn('Invoice payment failed', { customerId, invoiceId: invoice.id });

        const supabase = getSupabase();

        // Find organization by customer ID
        const { data: org } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('stripe_customer_id', customerId)
          .single();

        if (org) {
          // Update organization status
          await supabase
            .from('organizations')
            .update({ subscription_status: 'past_due' })
            .eq('id', org.id);

          // Log billing alert for failed payment
          const amountDue = invoice.amount_due ? invoice.amount_due / 100 : null;
          const formattedAmount = formatBillingAmount(amountDue, invoice.currency || 'eur');
          await supabase.from('billing_alerts').insert({
            organization_id: org.id,
            alert_type: 'payment_failed',
            severity: 'error',
            title: 'Payment Failed',
            message: `Your payment of ${formattedAmount} could not be processed. Please update your payment method to continue using VECTERAI.`,
            stripe_event_id: event.id,
            stripe_invoice_id: invoice.id,
            amount_due: amountDue,
            currency: invoice.currency || 'eur',
            metadata: {
              attempt_count: invoice.attempt_count,
              next_payment_attempt: invoice.next_payment_attempt,
            },
          });

          logger.info('Billing alert created for failed payment', { organizationId: org.id });
        }
        break;
      }

      default:
        logger.debug('Unhandled Stripe event type', { type: event.type });
    }

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook error', { error });
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

