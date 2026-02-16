'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { AlertCircle, Check, Loader2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateAIConfig } from '../actions/updateAIConfig';
import type { SettingsFormState, RestaurantSettings } from '../types';
import type { Restaurant } from '@/lib/supabase/types';

const initialState: SettingsFormState = {
  error: null,
  success: false,
};

interface AIConfigTabProps {
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

interface ToggleProps {
  label: string;
  description: string;
  name: string;
  defaultChecked?: boolean;
}

function Toggle({ label, description, name, defaultChecked }: ToggleProps) {
  return (
    <label className="flex items-start gap-4 cursor-pointer group">
      <div className="relative mt-1">
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
          'peer-focus:ring-2 peer-focus:ring-electric-blue peer-focus:ring-offset-2 peer-focus:ring-offset-deep-navy'
        )} />
        <div className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
          'peer-checked:translate-x-5'
        )} />
      </div>
      <div className="flex-1">
        <p className="font-medium text-white group-hover:text-electric-blue transition-colors">
          {label}
        </p>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </label>
  );
}

export function AIConfigTab({ restaurant }: AIConfigTabProps) {
  const updateAIConfigWithId = updateAIConfig.bind(null, restaurant.id);
  const [state, formAction] = useFormState(updateAIConfigWithId, initialState);

  const settings = (restaurant.settings || {}) as unknown as RestaurantSettings;
  const aiSettings = settings.ai || {
    allowReservations: true,
    allowOrders: true,
    customInstructions: '',
    greeting: 'Welcome! How can I help you today?',
    personality: 'friendly',
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

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Capabilities</h3>
            <p className="text-sm text-gray-400">Control what your AI assistant can do</p>
          </div>
        </div>

        <div className="space-y-6 bg-white/5 rounded-xl p-6">
          <Toggle
            label="Allow Reservations"
            description="AI can accept and manage table reservations on your behalf"
            name="allowReservations"
            defaultChecked={aiSettings.allowReservations}
          />

          <div className="border-t border-white/10" />

          <Toggle
            label="Allow Orders"
            description="AI can take and process takeout/delivery orders"
            name="allowOrders"
            defaultChecked={aiSettings.allowOrders}
          />
        </div>
      </div>

      {/* AI Personality & Greeting */}
      <div className="space-y-6 pt-6 border-t border-white/10">
        <div>
          <h3 className="text-lg font-semibold text-white">AI Personality</h3>
          <p className="text-sm text-gray-400 mt-1">
            Choose how your AI assistant communicates with customers
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="personality" className="block text-sm font-medium text-gray-300">
              Communication Style
            </label>
            <select
              id="personality"
              name="personality"
              defaultValue={aiSettings.personality || 'friendly'}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg',
                'bg-white/5 border border-white/10',
                'text-white',
                'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent',
                'transition-all duration-200'
              )}
            >
              <option value="friendly" className="bg-deep-navy">Friendly - Warm and conversational</option>
              <option value="formal" className="bg-deep-navy">Formal - Professional and polished</option>
              <option value="efficient" className="bg-deep-navy">Efficient - Direct and to-the-point</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="greeting" className="block text-sm font-medium text-gray-300">
              Greeting Message
            </label>
            <textarea
              id="greeting"
              name="greeting"
              defaultValue={aiSettings.greeting || 'Welcome! How can I help you today?'}
              placeholder="e.g., Welcome to The Blue Kitchen! I'm your AI assistant. How may I help you today?"
              rows={3}
              maxLength={500}
              className={cn(
                'w-full px-4 py-3 rounded-lg resize-none',
                'bg-white/5 border border-white/10',
                'text-white placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent',
                'transition-all duration-200'
              )}
            />
            <p className="text-xs text-gray-500">This message greets customers when they start a conversation</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-white/10">
        <div>
          <h3 className="text-lg font-semibold text-white">Custom Instructions</h3>
          <p className="text-sm text-gray-400 mt-1">
            Provide additional context or rules for your AI assistant
          </p>
        </div>

        <textarea
          name="customInstructions"
          defaultValue={aiSettings.customInstructions}
          placeholder="e.g., We specialize in Italian cuisine. Always mention our daily pasta special. We don't accept reservations for parties larger than 8..."
          rows={6}
          maxLength={2000}
          className={cn(
            'w-full px-4 py-3 rounded-lg resize-none',
            'bg-white/5 border border-white/10',
            'text-white placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent',
            'transition-all duration-200'
          )}
        />
        <p className="text-xs text-gray-500">Maximum 2000 characters</p>
      </div>

      <div className="flex justify-end pt-6 border-t border-white/10">
        <SubmitButton />
      </div>
    </form>
  );
}
