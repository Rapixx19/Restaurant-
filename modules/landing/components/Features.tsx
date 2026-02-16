'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FEATURES } from '../constants/features';
import type { FeatureCardProps } from '../types';

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

function FeatureCard({ icon: Icon, title, description, gradient, index }: FeatureCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={cn(
        'group relative p-6 rounded-2xl',
        'bg-card border border-white/5',
        'hover:border-electric-blue/30',
        'transition-colors duration-300'
      )}
    >
      {/* Gradient Glow on Hover */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100',
          'bg-gradient-to-br transition-opacity duration-300',
          gradient,
          'blur-xl -z-10 scale-90'
        )}
        style={{ opacity: 0.1 }}
      />

      {/* Icon */}
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
          'bg-gradient-to-br',
          gradient
        )}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>

      {/* Content */}
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>

      {/* Number Indicator */}
      <div className="absolute top-4 right-4 text-4xl font-bold text-white/5">
        {String(index + 1).padStart(2, '0')}
      </div>
    </motion.div>
  );
}

export function Features() {
  return (
    <section id="features" className="py-24 bg-deep-navy relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-electric-blue/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Everything You Need to{' '}
            <span className="bg-gradient-to-r from-electric-blue to-cyan-400 bg-clip-text text-transparent">
              Automate
            </span>
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-gray-400">
            A complete AI platform designed specifically for restaurants. Handle every customer
            interaction with intelligence and ease.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {FEATURES.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              gradient={feature.gradient}
              index={index}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
