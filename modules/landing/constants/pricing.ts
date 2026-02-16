/**
 * Single Source of Truth for VECTERAI Pricing Tiers
 * All pricing-related data should be imported from this file.
 */

export interface PricingFeature {
  name: string;
  included: boolean;
  limit?: string;
}

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    annually: number;
  };
  currency: string;
  features: PricingFeature[];
  limits: {
    phoneMinutes: number | 'unlimited';
    chatMessages: number | 'unlimited';
    reservations: number | 'unlimited';
    orders: number | 'unlimited';
    customerProfiles: number | 'unlimited';
    menuItems: number | 'unlimited';
    locations: number;
    teamMembers: number | 'unlimited';
  };
  cta: string;
  popular?: boolean;
  enterprise?: boolean;
}

export const PRICING_TIERS: readonly PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out VECTERAI',
    price: {
      monthly: 0,
      annually: 0,
    },
    currency: 'USD',
    features: [
      { name: 'AI Phone Agent', included: true, limit: '50 min/month' },
      { name: 'Chat Widget', included: true, limit: '100 messages/month' },
      { name: 'Reservation Management', included: true, limit: '25/month' },
      { name: 'Order Processing', included: false },
      { name: 'Customer Profiles', included: true, limit: '50 profiles' },
      { name: 'Menu Management', included: true, limit: '20 items' },
      { name: 'Analytics Dashboard', included: false },
      { name: 'Priority Support', included: false },
    ],
    limits: {
      phoneMinutes: 50,
      chatMessages: 100,
      reservations: 25,
      orders: 0,
      customerProfiles: 50,
      menuItems: 20,
      locations: 1,
      teamMembers: 1,
    },
    cta: 'Start Free',
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'For small restaurants getting started',
    price: {
      monthly: 49,
      annually: 39,
    },
    currency: 'USD',
    features: [
      { name: 'AI Phone Agent', included: true, limit: '300 min/month' },
      { name: 'Chat Widget', included: true, limit: '1,000 messages/month' },
      { name: 'Reservation Management', included: true, limit: '200/month' },
      { name: 'Order Processing', included: true, limit: '100/month' },
      { name: 'Customer Profiles', included: true, limit: '500 profiles' },
      { name: 'Menu Management', included: true, limit: '100 items' },
      { name: 'Analytics Dashboard', included: true },
      { name: 'Priority Support', included: false },
    ],
    limits: {
      phoneMinutes: 300,
      chatMessages: 1000,
      reservations: 200,
      orders: 100,
      customerProfiles: 500,
      menuItems: 100,
      locations: 1,
      teamMembers: 3,
    },
    cta: 'Get Started',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For growing restaurants with high volume',
    price: {
      monthly: 149,
      annually: 119,
    },
    currency: 'USD',
    features: [
      { name: 'AI Phone Agent', included: true, limit: '1,500 min/month' },
      { name: 'Chat Widget', included: true, limit: 'Unlimited' },
      { name: 'Reservation Management', included: true, limit: 'Unlimited' },
      { name: 'Order Processing', included: true, limit: 'Unlimited' },
      { name: 'Customer Profiles', included: true, limit: 'Unlimited' },
      { name: 'Menu Management', included: true, limit: 'Unlimited' },
      { name: 'Analytics Dashboard', included: true },
      { name: 'Priority Support', included: true },
    ],
    limits: {
      phoneMinutes: 1500,
      chatMessages: 'unlimited',
      reservations: 'unlimited',
      orders: 'unlimited',
      customerProfiles: 'unlimited',
      menuItems: 'unlimited',
      locations: 3,
      teamMembers: 10,
    },
    cta: 'Go Professional',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For restaurant chains and franchises',
    price: {
      monthly: 0,
      annually: 0,
    },
    currency: 'USD',
    features: [
      { name: 'AI Phone Agent', included: true, limit: 'Unlimited' },
      { name: 'Chat Widget', included: true, limit: 'Unlimited' },
      { name: 'Reservation Management', included: true, limit: 'Unlimited' },
      { name: 'Order Processing', included: true, limit: 'Unlimited' },
      { name: 'Customer Profiles', included: true, limit: 'Unlimited' },
      { name: 'Menu Management', included: true, limit: 'Unlimited' },
      { name: 'Analytics Dashboard', included: true },
      { name: 'Priority Support', included: true },
      { name: 'Custom Integrations', included: true },
      { name: 'Dedicated Account Manager', included: true },
      { name: 'SLA Guarantee', included: true },
    ],
    limits: {
      phoneMinutes: 'unlimited',
      chatMessages: 'unlimited',
      reservations: 'unlimited',
      orders: 'unlimited',
      customerProfiles: 'unlimited',
      menuItems: 'unlimited',
      locations: 'unlimited' as unknown as number,
      teamMembers: 'unlimited',
    },
    cta: 'Contact Sales',
    enterprise: true,
  },
] as const;

/**
 * Get a pricing tier by ID
 */
export function getPricingTier(id: string): PricingTier | undefined {
  return PRICING_TIERS.find((tier) => tier.id === id);
}

/**
 * Calculate annual savings compared to monthly billing
 */
export function calculateAnnualSavings(tier: PricingTier): number {
  if (tier.enterprise) return 0;
  return (tier.price.monthly - tier.price.annually) * 12;
}
