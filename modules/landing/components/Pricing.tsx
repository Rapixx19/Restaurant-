'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRICING_TIERS, type PricingTier } from '../constants/pricing';
import type { PricingProps, BillingCycle } from '../types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
};

interface PricingCardProps {
  tier: PricingTier;
  billingCycle: BillingCycle['type'];
}

function PricingCard({ tier, billingCycle }: PricingCardProps) {
  const price = billingCycle === 'monthly' ? tier.price.monthly : tier.price.annually;
  const isEnterprise = tier.enterprise;

  return (
    <motion.div
      variants={cardVariants}
      className={cn(
        'relative flex flex-col p-6 rounded-2xl',
        'bg-card border',
        tier.popular
          ? 'border-electric-blue shadow-lg shadow-electric-blue/20'
          : 'border-white/10',
        'hover:border-electric-blue/50 transition-colors duration-300'
      )}
    >
      {/* Popular Badge */}
      {tier.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1 rounded-full text-xs font-semibold bg-electric-blue text-white">
            Most Popular
          </span>
        </div>
      )}

      {/* Tier Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">{tier.name}</h3>
        <p className="text-sm text-gray-400">{tier.description}</p>
      </div>

      {/* Price */}
      <div className="mb-6">
        {isEnterprise ? (
          <div className="text-3xl font-bold text-white">Custom</div>
        ) : (
          <div className="flex items-baseline">
            <span className="text-4xl font-bold text-white">${price}</span>
            <span className="text-gray-400 ml-2">/month</span>
          </div>
        )}
        {!isEnterprise && billingCycle === 'annually' && (
          <p className="text-sm text-green-400 mt-1">
            Save ${(tier.price.monthly - tier.price.annually) * 12}/year
          </p>
        )}
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-3 mb-6">
        {tier.features.map((feature) => (
          <li key={feature.name} className="flex items-start gap-3">
            {feature.included ? (
              <Check className="w-5 h-5 text-electric-blue flex-shrink-0 mt-0.5" />
            ) : (
              <X className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            )}
            <span className={cn('text-sm', feature.included ? 'text-gray-300' : 'text-gray-500')}>
              {feature.name}
              {feature.limit && feature.included && (
                <span className="text-gray-500 ml-1">({feature.limit})</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href={isEnterprise ? '/contact' : '/signup'}
        className={cn(
          'w-full py-3 rounded-xl text-center font-semibold',
          'transition-all duration-300',
          tier.popular
            ? 'bg-electric-blue hover:bg-electric-blue-600 text-white hover:shadow-lg hover:shadow-electric-blue/25'
            : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20'
        )}
      >
        {tier.cta}
      </Link>
    </motion.div>
  );
}

export function Pricing({ defaultBillingCycle = 'monthly' }: PricingProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle['type']>(defaultBillingCycle);

  return (
    <section id="pricing" className="py-24 bg-deep-navy relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-electric-blue/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Simple,{' '}
            <span className="bg-gradient-to-r from-electric-blue to-cyan-400 bg-clip-text text-transparent">
              Transparent
            </span>{' '}
            Pricing
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-gray-400">
            Choose the plan that fits your restaurant. Scale up as you grow.
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center gap-4 mb-12"
        >
          <span
            className={cn(
              'text-sm font-medium transition-colors',
              billingCycle === 'monthly' ? 'text-white' : 'text-gray-500'
            )}
          >
            Monthly
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annually' : 'monthly')}
            className={cn(
              'relative w-14 h-7 rounded-full transition-colors',
              billingCycle === 'annually' ? 'bg-electric-blue' : 'bg-white/10'
            )}
            aria-label="Toggle billing cycle"
          >
            <span
              className={cn(
                'absolute top-1 w-5 h-5 rounded-full bg-white transition-transform',
                billingCycle === 'annually' ? 'translate-x-8' : 'translate-x-1'
              )}
            />
          </button>
          <span
            className={cn(
              'text-sm font-medium transition-colors',
              billingCycle === 'annually' ? 'text-white' : 'text-gray-500'
            )}
          >
            Annually
            <span className="ml-1 text-green-400">(Save 20%)</span>
          </span>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {PRICING_TIERS.map((tier) => (
            <PricingCard key={tier.id} tier={tier} billingCycle={billingCycle} />
          ))}
        </motion.div>

        {/* Enterprise CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-400 mb-4">
            Need a custom solution for your restaurant chain?
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center text-electric-blue hover:text-electric-blue-400 font-medium transition-colors"
          >
            Contact our sales team
            <span className="ml-1">→</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
