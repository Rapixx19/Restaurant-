'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { AlertCircle, Check, Loader2, Phone, Mic, MessageSquare, PhoneCall, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateVoice, triggerTestCall } from '../actions/updateVoice';
import { ELEVENLABS_VOICES, SUPPORTED_LANGUAGES } from '../types';
import type { SettingsFormState, RestaurantSettings } from '../types';
import type { Restaurant } from '@/lib/supabase/types';
import { useState, useTransition } from 'react';

const initialState: SettingsFormState = {
  error: null,
  success: false,
};

interface VoiceTabProps {
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

export function VoiceTab({ restaurant }: VoiceTabProps) {
  const updateVoiceWithId = updateVoice.bind(null, restaurant.id);
  const [state, formAction] = useFormState(updateVoiceWithId, initialState);
  const [testCallPending, startTestCall] = useTransition();
  const [testCallResult, setTestCallResult] = useState<{ success: boolean; message: string } | null>(null);

  const settings = (restaurant.settings || {}) as unknown as RestaurantSettings;
  const voiceSettings = settings.voice || {
    enabled: false,
    vapiAssistantId: undefined,
    vapiPublicKey: undefined,
    elevenLabsVoiceId: 'EXAVITQu4vr4xnSDxMaL',
    testPhoneNumber: undefined,
    smsOnCompletion: true,
    primaryLanguage: 'en',
    autoLanguageDetection: true,
    vapiPhoneNumberId: undefined,
  };

  const handleTestCall = () => {
    startTestCall(async () => {
      const result = await triggerTestCall(restaurant.id);
      setTestCallResult({
        success: result.success,
        message: result.success
          ? 'Test call initiated! You should receive a call shortly.'
          : result.error || 'Failed to initiate test call',
      });
      // Clear message after 5 seconds
      setTimeout(() => setTestCallResult(null), 5000);
    });
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

      {testCallResult && (
        <div className={cn(
          'flex items-center gap-2 p-4 rounded-lg',
          testCallResult.success
            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        )}>
          {testCallResult.success ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm">{testCallResult.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
          <Phone className="w-5 h-5 text-indigo-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Voice AI Phone Agent</h3>
          <p className="text-sm text-gray-400">Configure your AI-powered phone assistant using Vapi + ElevenLabs</p>
        </div>
      </div>

      {/* Enable Voice */}
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Mic className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="font-medium text-white">Enable Voice Agent</p>
            <p className="text-sm text-gray-400">Allow AI to handle incoming phone calls</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            name="voiceEnabled"
            value="true"
            defaultChecked={voiceSettings.enabled}
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

      {/* Vapi Configuration */}
      <div className="space-y-4">
        <h4 className="font-medium text-white">Vapi Configuration</h4>

        <div>
          <label htmlFor="vapiAssistantId" className="block text-sm text-gray-400 mb-2">
            Vapi Assistant ID
          </label>
          <input
            type="text"
            id="vapiAssistantId"
            name="vapiAssistantId"
            placeholder="asst_xxxxxxxxxxxxxxxx"
            defaultValue={voiceSettings.vapiAssistantId || ''}
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-white/5 border border-white/10',
              'text-white placeholder:text-gray-500 font-mono text-sm',
              'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent'
            )}
          />
          <p className="text-xs text-gray-500 mt-1">
            Get this from your{' '}
            <a href="https://dashboard.vapi.ai" target="_blank" rel="noopener noreferrer" className="text-electric-blue hover:underline">
              Vapi Dashboard
            </a>
          </p>
        </div>

        <div>
          <label htmlFor="vapiPublicKey" className="block text-sm text-gray-400 mb-2">
            Vapi Public Key (Optional)
          </label>
          <input
            type="text"
            id="vapiPublicKey"
            name="vapiPublicKey"
            placeholder="pk_xxxxxxxxxxxxxxxx"
            defaultValue={voiceSettings.vapiPublicKey || ''}
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-white/5 border border-white/10',
              'text-white placeholder:text-gray-500 font-mono text-sm',
              'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent'
            )}
          />
        </div>
      </div>

      {/* Voice Selection */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <h4 className="font-medium text-white">Voice Selection</h4>
        <p className="text-sm text-gray-400">Choose an ElevenLabs voice for your assistant</p>

        <div className="grid gap-3">
          {ELEVENLABS_VOICES.map((voice) => (
            <label
              key={voice.id}
              className={cn(
                'flex items-center gap-4 p-4 rounded-xl cursor-pointer',
                'bg-white/5 border border-white/10',
                'hover:border-white/20 transition-all duration-200',
                'has-[:checked]:border-electric-blue has-[:checked]:bg-electric-blue/10'
              )}
            >
              <input
                type="radio"
                name="elevenLabsVoiceId"
                value={voice.id}
                defaultChecked={voiceSettings.elevenLabsVoiceId === voice.id}
                className="sr-only"
              />
              <div className="flex-1">
                <p className="font-medium text-white">{voice.name}</p>
                <p className="text-sm text-gray-400">{voice.description}</p>
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-white/20 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-electric-blue scale-0 peer-checked:scale-100" />
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Language Settings */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h4 className="font-medium text-white">Language Settings</h4>
            <p className="text-sm text-gray-400">Configure language preferences for your voice assistant</p>
          </div>
        </div>

        <div>
          <label htmlFor="primaryLanguage" className="block text-sm text-gray-400 mb-2">
            Primary Language
          </label>
          <select
            id="primaryLanguage"
            name="primaryLanguage"
            defaultValue={voiceSettings.primaryLanguage || 'en'}
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-white/5 border border-white/10',
              'text-white',
              'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent'
            )}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-gray-900">
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
          <div>
            <p className="font-medium text-white">Auto-Detect Language</p>
            <p className="text-sm text-gray-400">Automatically switch languages based on caller</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="autoLanguageDetection"
              value="true"
              defaultChecked={voiceSettings.autoLanguageDetection !== false}
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
      </div>

      {/* Phone Number Assignment */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <h4 className="font-medium text-white">Phone Number</h4>
        <div>
          <label htmlFor="vapiPhoneNumberId" className="block text-sm text-gray-400 mb-2">
            Vapi Phone Number ID
          </label>
          <input
            type="text"
            id="vapiPhoneNumberId"
            name="vapiPhoneNumberId"
            placeholder="pn_xxxxxxxxxxxxxxxx"
            defaultValue={voiceSettings.vapiPhoneNumberId || ''}
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-white/5 border border-white/10',
              'text-white placeholder:text-gray-500 font-mono text-sm',
              'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent'
            )}
          />
          <p className="text-xs text-gray-500 mt-1">
            The phone number ID from your Vapi dashboard for inbound calls
          </p>
        </div>
      </div>

      {/* Test Phone Number */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <h4 className="font-medium text-white">Test Configuration</h4>

        <div>
          <label htmlFor="testPhoneNumber" className="block text-sm text-gray-400 mb-2">
            Test Phone Number
          </label>
          <div className="flex gap-3">
            <input
              type="tel"
              id="testPhoneNumber"
              name="testPhoneNumber"
              placeholder="+1 555 123 4567"
              defaultValue={voiceSettings.testPhoneNumber || ''}
              className={cn(
                'flex-1 px-4 py-3 rounded-xl',
                'bg-white/5 border border-white/10',
                'text-white placeholder:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent'
              )}
            />
            <button
              type="button"
              onClick={handleTestCall}
              disabled={testCallPending || !voiceSettings.vapiAssistantId}
              className={cn(
                'flex items-center gap-2 px-4 py-3 rounded-xl',
                'bg-green-500/20 border border-green-500/30',
                'text-green-400 font-medium',
                'hover:bg-green-500/30 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {testCallPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PhoneCall className="w-4 h-4" />
              )}
              Test Call
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enter your phone number to receive a test call from your AI assistant
          </p>
        </div>
      </div>

      {/* SMS on Completion */}
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="font-medium text-white">SMS Confirmation</p>
            <p className="text-sm text-gray-400">Send SMS after completing reservations by phone</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            name="smsOnCompletion"
            value="true"
            defaultChecked={voiceSettings.smsOnCompletion}
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

      {/* Webhook URL Info */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <h4 className="font-medium text-white">Webhook Configuration</h4>
        <p className="text-sm text-gray-400">
          Configure your Vapi assistant to send webhooks to this URL:
        </p>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <code className="text-sm text-electric-blue font-mono break-all">
            {typeof window !== 'undefined'
              ? `${window.location.origin}/api/webhooks/vapi?restaurantId=${restaurant.id}`
              : `https://your-domain.com/api/webhooks/vapi?restaurantId=${restaurant.id}`}
          </code>
        </div>
        <p className="text-xs text-gray-500">
          Set this as the &quot;Server URL&quot; in your Vapi Assistant settings.
        </p>
      </div>

      <div className="flex justify-end pt-6 border-t border-white/10">
        <SubmitButton />
      </div>
    </form>
  );
}
