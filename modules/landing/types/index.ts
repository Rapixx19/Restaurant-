/**
 * Types for the landing module.
 */

export interface NavLink {
  href: string;
  label: string;
}

export interface HeroProps {
  title: string;
  subtitle: string;
  ctaPrimary: {
    label: string;
    href: string;
  };
  ctaSecondary?: {
    label: string;
    href: string;
  };
}

export interface NavigationProps {
  links: NavLink[];
  ctaLabel: string;
  ctaHref: string;
}

export interface SectionProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

export interface BillingCycle {
  type: 'monthly' | 'annually';
}

export interface PricingProps {
  defaultBillingCycle?: BillingCycle['type'];
}

export interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  gradient: string;
  index: number;
}
