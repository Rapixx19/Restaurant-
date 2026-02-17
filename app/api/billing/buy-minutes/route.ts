import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

/**
 * Buy More Minutes API
 *
 * Creates a Stripe Checkout session for purchasing additional voice minutes.
 * This is a one-time purchase that adds minutes to the organization's balance.
 */

// Lazy initialization to avoid build-time errors
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover',
  });
}

// Minute package options (EUR pricing to match €29/€79/€199 plan tiers)
// Prices in cents: €19 = 1900, €79 = 7900, €149 = 14900
const MINUTE_PACKAGES = [
  { id: 'minutes_100', minutes: 100, price: 1900, name: '100 Voice Minutes', description: '€0.19 per minute' },
  { id: 'minutes_500', minutes: 500, price: 7900, name: '500 Voice Minutes', description: '€0.16 per minute' },
  { id: 'minutes_1000', minutes: 1000, price: 14900, name: '1000 Voice Minutes', description: '€0.15 per minute' },
] as const;

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, packageId = 'minutes_100' } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Verify user has access to this organization
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, stripe_customer_id')
      .eq('id', organizationId)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check if user owns or is member of this organization
    const { data: ownership } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .eq('owner_id', user.id)
      .single();

    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (!ownership && !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get the selected package
    const selectedPackage = MINUTE_PACKAGES.find((p) => p.id === packageId) || MINUTE_PACKAGES[0];

    // Create or get Stripe customer
    let stripeCustomerId = org.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: {
          organizationId: org.id,
          userId: user.id,
        },
      });
      stripeCustomerId = customer.id;

      // Save customer ID to organization
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', organizationId);
    }

    // Create Stripe Checkout session for one-time payment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: selectedPackage.name,
              description: `Add ${selectedPackage.minutes} voice minutes to your account (${selectedPackage.description})`,
            },
            unit_amount: selectedPackage.price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'minute_topup',
        organizationId: org.id,
        minutes: selectedPackage.minutes.toString(),
        packageId: selectedPackage.id,
      },
      success_url: `${appUrl}/dashboard/billing?success=minutes&minutes=${selectedPackage.minutes}`,
      cancel_url: `${appUrl}/dashboard/billing?canceled=minutes`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Buy minutes error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
