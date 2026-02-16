'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type { AuthCardProps } from '../types';

/**
 * Card wrapper for auth pages with animation.
 */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-deep-navy px-4">
      {/* Background effects */}
      <div className="absolute inset-0 bg-hero-glow opacity-50" />
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-electric-blue/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electric-blue to-blue-400 flex items-center justify-center">
            <span className="text-white font-bold text-xl">V</span>
          </div>
          <span className="text-2xl font-bold text-white">VECTERAI</span>
        </Link>

        {/* Card */}
        <div className="bg-card border border-white/10 rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
            <p className="text-gray-400">{description}</p>
          </div>

          {children}

          {footer && <div className="mt-6 text-center">{footer}</div>}
        </div>
      </motion.div>
    </div>
  );
}
