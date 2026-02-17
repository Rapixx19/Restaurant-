'use client';

import { Clock, AlertCircle, Phone, Headphones, CheckCircle2 } from 'lucide-react';

type RestaurantStatus = 'pending' | 'reviewing' | 'info_requested' | 'active' | 'suspended';

interface OnboardingStatusBannerProps {
  status: RestaurantStatus;
  twilioNumber?: string | null;
}

/**
 * OnboardingStatusBanner
 *
 * Displays status-specific messaging during the support-led onboarding flow.
 * - pending/reviewing: "We're reviewing your profile..."
 * - info_requested: "Action required - check your email"
 * - active: Shows the live Twilio number (or hides banner)
 * - suspended: Account suspended message
 */
export function OnboardingStatusBanner({ status, twilioNumber }: OnboardingStatusBannerProps) {
  // Active status with phone number - show success state
  if (status === 'active' && twilioNumber) {
    return (
      <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white mb-1">
              Your AI Host is Live
            </h3>
            <p className="text-gray-300 mb-3">
              Your customers can now call your dedicated business line to make reservations and inquiries.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-lg">
              <Phone className="w-5 h-5" />
              <span>{twilioNumber}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active without phone - hide banner
  if (status === 'active') {
    return null;
  }

  // Suspended status
  if (status === 'suspended') {
    return (
      <div className="bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white mb-1">
              Account Suspended
            </h3>
            <p className="text-gray-300">
              Your account has been temporarily suspended. Please contact support to resolve this issue.
            </p>
            <div className="mt-4">
              <a
                href="mailto:support@vecterai.com"
                className="text-red-400 hover:text-red-300 underline underline-offset-2"
              >
                Contact support
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Info requested status - Action required
  if (status === 'info_requested') {
    return (
      <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white mb-1">
              Action Required
            </h3>
            <p className="text-gray-300 mb-4">
              Our team needs a bit more information to finalize your setup.
              Please check your email or update your profile details.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/dashboard/settings"
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 rounded-lg text-orange-400 font-medium transition-colors"
              >
                Update Profile
              </a>
              <a
                href="mailto:support@vecterai.com"
                className="text-gray-400 hover:text-white underline underline-offset-2 py-2"
              >
                Contact support
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pending or Reviewing status
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
            {status === 'reviewing' ? 'Under Review' : 'Verification in Progress'}
          </h3>
          <p className="text-gray-300 mb-4">
            Welcome! The Vecterai team is currently reviewing your restaurant profile and menu.
            We will assign your dedicated business number shortly.
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
