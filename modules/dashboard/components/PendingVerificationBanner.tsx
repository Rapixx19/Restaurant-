'use client';

import { Clock, Phone, Headphones } from 'lucide-react';

/**
 * PendingVerificationBanner
 *
 * Displayed when restaurant.status === 'pending'
 * Indicates that support is verifying the configuration and will assign a Twilio number.
 */
export function PendingVerificationBanner() {
  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white mb-1">
            Verification in Progress
          </h3>
          <p className="text-gray-300 mb-4">
            Our support team is verifying your configuration. We will assign your
            Twilio number and activate your AI Host shortly.
          </p>

          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Phone className="w-4 h-4 text-amber-400" />
              <span>Phone number assignment pending</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Headphones className="w-4 h-4 text-amber-400" />
              <span>Voice AI activation pending</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-amber-500/20">
        <p className="text-sm text-gray-400">
          Need help?{' '}
          <a
            href="mailto:support@vecterai.com"
            className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
