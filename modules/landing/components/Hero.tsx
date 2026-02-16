'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Phone, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HeroProps } from '../types';

const defaultProps: HeroProps = {
  title: 'AI-Powered Restaurant Operations',
  subtitle:
    'Transform your restaurant with intelligent phone agents, smart reservations, and seamless order management. Let AI handle the calls while you focus on the food.',
  ctaPrimary: {
    label: 'Start Free Trial',
    href: '/signup',
  },
  ctaSecondary: {
    label: 'Watch Demo',
    href: '#demo',
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
};

export function Hero({
  title = defaultProps.title,
  subtitle = defaultProps.subtitle,
  ctaPrimary = defaultProps.ctaPrimary,
  ctaSecondary = defaultProps.ctaSecondary,
}: Partial<HeroProps>) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-deep-navy">
      {/* Background Glow Effects */}
      <div className="absolute inset-0 bg-hero-glow" />
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-electric-blue/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <motion.div
          className="text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-8">
            <span
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full',
                'bg-electric-blue/10 border border-electric-blue/20',
                'text-sm text-electric-blue'
              )}
            >
              <Sparkles size={16} />
              <span>AI-First Restaurant Platform</span>
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight"
          >
            <span className="block">{title.split(' ').slice(0, 2).join(' ')}</span>
            <span className="block bg-gradient-to-r from-electric-blue to-cyan-400 bg-clip-text text-transparent">
              {title.split(' ').slice(2).join(' ')}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-400 leading-relaxed"
          >
            {subtitle}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href={ctaPrimary.href}
              className={cn(
                'group inline-flex items-center justify-center gap-2',
                'px-8 py-4 rounded-xl text-lg font-semibold',
                'bg-electric-blue hover:bg-electric-blue-600 text-white',
                'transition-all duration-300',
                'hover:shadow-xl hover:shadow-electric-blue/25',
                'hover:-translate-y-0.5'
              )}
            >
              {ctaPrimary.label}
              <ArrowRight
                size={20}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
            {ctaSecondary && (
              <Link
                href={ctaSecondary.href}
                className={cn(
                  'inline-flex items-center justify-center gap-2',
                  'px-8 py-4 rounded-xl text-lg font-semibold',
                  'bg-white/5 hover:bg-white/10 text-white',
                  'border border-white/10 hover:border-white/20',
                  'transition-all duration-300'
                )}
              >
                <Phone size={20} />
                {ctaSecondary.label}
              </Link>
            )}
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={itemVariants}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto"
          >
            {[
              { value: '500+', label: 'Restaurants' },
              { value: '2M+', label: 'Calls Handled' },
              { value: '99.9%', label: 'Uptime' },
              { value: '4.9/5', label: 'Rating' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
