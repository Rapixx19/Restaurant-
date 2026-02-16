'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateInfo } from '../actions/updateInfo';
import { LogoUpload } from './LogoUpload';
import type { SettingsFormState } from '../types';
import type { Restaurant } from '@/lib/supabase/types';

const initialState: SettingsFormState = {
  error: null,
  success: false,
};

interface InfoTabProps {
  restaurant: Restaurant;
  userId: string;
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

interface InputProps {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

function Input({ label, name, type = 'text', defaultValue, placeholder, required, error }: InputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={cn(
          'w-full px-4 py-2.5 rounded-lg',
          'bg-white/5 border',
          error ? 'border-red-500/50' : 'border-white/10',
          'text-white placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent',
          'transition-all duration-200'
        )}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

interface TextareaProps {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
  error?: string;
}

function Textarea({ label, name, defaultValue, placeholder, rows = 3, error }: TextareaProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-300">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          'w-full px-4 py-2.5 rounded-lg resize-none',
          'bg-white/5 border',
          error ? 'border-red-500/50' : 'border-white/10',
          'text-white placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent',
          'transition-all duration-200'
        )}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

export function InfoTab({ restaurant, userId }: InfoTabProps) {
  const updateInfoWithId = updateInfo.bind(null, restaurant.id);
  const [state, formAction] = useFormState(updateInfoWithId, initialState);

  const address = (restaurant.address || {}) as Record<string, string>;

  return (
    <form action={formAction} className="space-y-6">
      {state.error && !state.fieldErrors && (
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

      {/* Logo Upload Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Restaurant Logo</h3>
        <LogoUpload
          restaurantId={restaurant.id}
          userId={userId}
          currentLogoUrl={restaurant.image_url}
        />
      </div>

      <div className="space-y-6 pt-6 border-t border-white/10">
        <h3 className="text-lg font-semibold text-white">Basic Information</h3>

        <Input
          label="Restaurant Name"
          name="name"
          defaultValue={restaurant.name}
          required
          error={state.fieldErrors?.name?.[0]}
        />

        <Textarea
          label="Description"
          name="description"
          defaultValue={restaurant.description || ''}
          placeholder="Tell customers about your restaurant..."
          error={state.fieldErrors?.description?.[0]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Phone"
            name="phone"
            type="tel"
            defaultValue={restaurant.phone || ''}
            placeholder="(555) 123-4567"
          />
          <Input
            label="Email"
            name="email"
            type="email"
            defaultValue={restaurant.email || ''}
            placeholder="contact@restaurant.com"
          />
        </div>

        <Input
          label="Website"
          name="website"
          type="url"
          defaultValue={restaurant.website || ''}
          placeholder="https://yourrestaurant.com"
        />
      </div>

      <div className="space-y-6 pt-6 border-t border-white/10">
        <h3 className="text-lg font-semibold text-white">Address</h3>

        <Input
          label="Street Address"
          name="street"
          defaultValue={address.street || ''}
          required
          error={state.fieldErrors?.street?.[0]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="City"
            name="city"
            defaultValue={address.city || ''}
            required
            error={state.fieldErrors?.city?.[0]}
          />
          <Input
            label="State/Province"
            name="state"
            defaultValue={address.state || ''}
            required
            error={state.fieldErrors?.state?.[0]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="ZIP/Postal Code"
            name="zip"
            defaultValue={address.zip || ''}
            required
            error={state.fieldErrors?.zip?.[0]}
          />
          <Input
            label="Country"
            name="country"
            defaultValue={address.country || 'United States'}
            required
            error={state.fieldErrors?.country?.[0]}
          />
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-white/10">
        <SubmitButton />
      </div>
    </form>
  );
}
