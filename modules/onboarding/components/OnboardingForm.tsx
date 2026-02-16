'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { AlertCircle, Store, MapPin, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createRestaurant } from '../actions/createRestaurant';
import { onboardingSchema } from '../schema';
import { TIMEZONES, type OnboardingFormData, type OnboardingFormState } from '../types';

const initialState: OnboardingFormState = {
  error: null,
  success: false,
};

/**
 * Submit button with loading state.
 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        'w-full flex items-center justify-center gap-2',
        'px-6 py-4 rounded-xl',
        'bg-electric-blue hover:bg-electric-blue-600',
        'text-white font-semibold text-lg',
        'transition-all duration-200',
        'hover:shadow-lg hover:shadow-electric-blue/25',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      {pending ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Creating your restaurant...
        </>
      ) : (
        'Create Restaurant'
      )}
    </button>
  );
}

/**
 * Styled input component for onboarding.
 */
interface InputProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  register: ReturnType<typeof useForm<OnboardingFormData>>['register'];
}

function Input({ label, name, type = 'text', placeholder, required, error, register }: InputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        id={name}
        type={type}
        placeholder={placeholder}
        {...register(name as keyof OnboardingFormData)}
        className={cn(
          'w-full px-4 py-3 rounded-lg',
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

/**
 * Styled select component.
 */
interface SelectProps {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  required?: boolean;
  error?: string;
  register: ReturnType<typeof useForm<OnboardingFormData>>['register'];
}

function Select({ label, name, options, required, error, register }: SelectProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <select
        id={name}
        {...register(name as keyof OnboardingFormData)}
        className={cn(
          'w-full px-4 py-3 rounded-lg',
          'bg-white/5 border',
          error ? 'border-red-500/50' : 'border-white/10',
          'text-white',
          'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent',
          'transition-all duration-200'
        )}
      >
        <option value="" className="bg-deep-navy">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-deep-navy">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

/**
 * Main onboarding form component.
 */
export function OnboardingForm() {
  const [state, formAction] = useFormState(createRestaurant, initialState);

  const {
    register,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      country: 'United States',
      timezone: 'America/New_York',
    },
  });

  // Merge server-side and client-side errors
  const getError = (field: keyof OnboardingFormData): string | undefined => {
    return errors[field]?.message || state.fieldErrors?.[field]?.[0];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Let&apos;s set up your restaurant
        </h1>
        <p className="text-gray-400">
          Tell us about your restaurant so we can personalize your AI experience.
        </p>
      </div>

      <form action={formAction} className="space-y-8">
        {state.error && !state.fieldErrors && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{state.error}</p>
          </div>
        )}

        {/* Restaurant Info Section */}
        <div className="bg-card border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-electric-blue/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-electric-blue" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Restaurant Details</h2>
              <p className="text-sm text-gray-400">Basic information about your business</p>
            </div>
          </div>

          <Input
            label="Restaurant Name"
            name="name"
            placeholder="e.g., The Blue Kitchen"
            required
            error={getError('name')}
            register={register}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              placeholder="(555) 123-4567"
              error={getError('phone')}
              register={register}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="contact@restaurant.com"
              error={getError('email')}
              register={register}
            />
          </div>
        </div>

        {/* Address Section */}
        <div className="bg-card border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Location</h2>
              <p className="text-sm text-gray-400">Where is your restaurant located?</p>
            </div>
          </div>

          <Input
            label="Street Address"
            name="street"
            placeholder="123 Main Street"
            required
            error={getError('street')}
            register={register}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="City"
              name="city"
              placeholder="New York"
              required
              error={getError('city')}
              register={register}
            />
            <Input
              label="State/Province"
              name="state"
              placeholder="NY"
              required
              error={getError('state')}
              register={register}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="ZIP/Postal Code"
              name="zip"
              placeholder="10001"
              required
              error={getError('zip')}
              register={register}
            />
            <Input
              label="Country"
              name="country"
              placeholder="United States"
              required
              error={getError('country')}
              register={register}
            />
          </div>
        </div>

        {/* Timezone Section */}
        <div className="bg-card border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Timezone</h2>
              <p className="text-sm text-gray-400">For accurate scheduling and reservations</p>
            </div>
          </div>

          <Select
            label="Timezone"
            name="timezone"
            options={TIMEZONES}
            required
            error={getError('timezone')}
            register={register}
          />
        </div>

        <SubmitButton />
      </form>
    </motion.div>
  );
}
