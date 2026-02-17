'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { AlertCircle, Check, Loader2, Mail, MessageSquare, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateNotifications } from '../actions/updateNotifications';
import type { SettingsFormState, RestaurantSettings } from '../types';
import type { Restaurant } from '@/lib/supabase/types';

const initialState: SettingsFormState = {
  error: null,
  success: false,
};

interface NotificationsTabProps {
  restaurant: Restaurant;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        'flex items-center justify-center gap-2',
        'px-6 py-2.5 rounded-lg',
        'bg-electric-blue hover:bg-electric-blue-600',
        'text-white font-medium',
        'transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving...
        </>
      ) : (
        'Save Changes'
      )}
    </button>
  );
}

interface ToggleRowProps {
  name: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultChecked: boolean;
  iconColor: string;
}

function ToggleRow({ name, label, description, icon, defaultChecked, iconColor }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
      <div className="flex items-center gap-4">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconColor)}>
          {icon}
        </div>
        <div>
          <p className="font-medium text-white">{label}</p>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          name={name}
          value="true"
          defaultChecked={defaultChecked}
          className="sr-only peer"
        />
        <div className={cn(
          'w-11 h-6 rounded-full transition-colors',
          'bg-white/10 peer-checked:bg-electric-blue',
          'peer-focus:ring-2 peer-focus:ring-electric-blue/50'
        )}>
          <div className={cn(
            'w-5 h-5 mt-0.5 ml-0.5 rounded-full bg-white transition-transform',
            'peer-checked:translate-x-5'
          )} />
        </div>
      </label>
    </div>
  );
}

export function NotificationsTab({ restaurant }: NotificationsTabProps) {
  const updateNotificationsWithId = updateNotifications.bind(null, restaurant.id);
  const [state, formAction] = useFormState(updateNotificationsWithId, initialState);

  const settings = (restaurant.settings || {}) as unknown as RestaurantSettings;
  const notificationSettings = settings.notifications || {
    emailEnabled: true,
    smsEnabled: true,
    replyToEmail: undefined,
  };

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{state.error}</p>
        </div>
      )}

      {state.success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
          <Check className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{state.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Customer Notifications</h3>
          <p className="text-sm text-gray-400">Configure how customers receive order and reservation confirmations</p>
        </div>
      </div>

      {/* Notification Channels */}
      <div className="space-y-3">
        <ToggleRow
          name="emailEnabled"
          label="Email Notifications"
          description="Send confirmation emails for orders and reservations"
          icon={<Mail className="w-5 h-5 text-blue-500" />}
          iconColor="bg-blue-500/10"
          defaultChecked={notificationSettings.emailEnabled}
        />

        <ToggleRow
          name="smsEnabled"
          label="SMS Notifications"
          description="Send text messages for order updates and reminders"
          icon={<MessageSquare className="w-5 h-5 text-green-500" />}
          iconColor="bg-green-500/10"
          defaultChecked={notificationSettings.smsEnabled}
        />
      </div>

      {/* Reply-To Email */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <div>
          <h4 className="font-medium text-white mb-1">Reply-To Email</h4>
          <p className="text-sm text-gray-400 mb-4">
            When customers reply to notification emails, responses will be sent here
          </p>
        </div>

        <input
          type="email"
          name="replyToEmail"
          placeholder="contact@yourrestaurant.com"
          defaultValue={notificationSettings.replyToEmail || ''}
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-white/5 border border-white/10',
            'text-white placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent',
            'transition-all duration-200'
          )}
        />
      </div>

      {/* Service Status */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <h4 className="font-medium text-white">Service Status</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Email (Resend)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                process.env.NEXT_PUBLIC_RESEND_CONFIGURED === 'true' ? 'bg-green-500' : 'bg-yellow-500'
              )} />
              <span className="text-xs text-gray-400">
                {process.env.NEXT_PUBLIC_RESEND_CONFIGURED === 'true' ? 'Configured' : 'Not configured'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">SMS (Twilio)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                process.env.NEXT_PUBLIC_TWILIO_CONFIGURED === 'true' ? 'bg-green-500' : 'bg-yellow-500'
              )} />
              <span className="text-xs text-gray-400">
                {process.env.NEXT_PUBLIC_TWILIO_CONFIGURED === 'true' ? 'Configured' : 'Not configured'}
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Contact support to configure notification services for your account.
        </p>
      </div>

      <div className="flex justify-end pt-6 border-t border-white/10">
        <SubmitButton />
      </div>
    </form>
  );
}
