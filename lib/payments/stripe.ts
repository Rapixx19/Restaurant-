import Stripe from 'stripe';

/**
 * Lazy-initialized Stripe client to avoid build-time errors.
 */
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2026-01-28.clover',
    });
  }
  return stripeInstance;
}

export interface CheckoutItem {
  name: string;
  description?: string;
  price: number;
  quantity: number;
}

export interface CreateCheckoutInput {
  orderId: string;
  restaurantId: string;
  restaurantName: string;
  items: CheckoutItem[];
  tax: number;
  total: number;
  customerEmail?: string;
  currency: string;
}

/**
 * Create a Stripe Checkout session for an order.
 * Returns the checkout URL for the customer.
 */
export async function createCheckoutSession(input: CreateCheckoutInput): Promise<string> {
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Build line items from the order items
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = input.items.map((item) => ({
    price_data: {
      currency: input.currency.toLowerCase(),
      product_data: {
        name: item.name,
        description: item.description,
      },
      unit_amount: Math.round(item.price * 100), // Stripe uses cents
    },
    quantity: item.quantity,
  }));

  // Add tax as a separate line item
  if (input.tax > 0) {
    lineItems.push({
      price_data: {
        currency: input.currency.toLowerCase(),
        product_data: {
          name: 'Tax',
        },
        unit_amount: Math.round(input.tax * 100),
      },
      quantity: 1,
    });
  }

  // Create the checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    customer_email: input.customerEmail,
    metadata: {
      order_id: input.orderId,
      restaurant_id: input.restaurantId,
    },
    success_url: `${appUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/order/cancelled?order_id=${input.orderId}`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
  });

  if (!session.url) {
    throw new Error('Failed to create checkout session URL');
  }

  return session.url;
}

/**
 * Verify a Stripe webhook signature.
 * CRITICAL: Always verify webhooks to prevent fake payment attacks.
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  // This will throw if verification fails
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Retrieve a checkout session by ID.
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  return stripe.checkout.sessions.retrieve(sessionId);
}
