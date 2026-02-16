import { z } from 'zod';

/**
 * Zod schema for restaurant onboarding form validation.
 */
export const onboardingSchema = z.object({
  name: z
    .string()
    .min(2, 'Restaurant name must be at least 2 characters')
    .max(100, 'Restaurant name must be less than 100 characters'),

  street: z
    .string()
    .min(5, 'Street address is required')
    .max(200, 'Street address is too long'),

  city: z
    .string()
    .min(2, 'City is required')
    .max(100, 'City name is too long'),

  state: z
    .string()
    .min(2, 'State/Province is required')
    .max(100, 'State/Province is too long'),

  zip: z
    .string()
    .min(3, 'ZIP/Postal code is required')
    .max(20, 'ZIP/Postal code is too long'),

  country: z
    .string()
    .min(2, 'Country is required')
    .max(100, 'Country is too long'),

  timezone: z
    .string()
    .min(1, 'Please select a timezone'),

  phone: z
    .string()
    .optional(),

  email: z
    .string()
    .email('Please enter a valid email')
    .optional()
    .or(z.literal('')),
});

export type OnboardingSchemaType = z.infer<typeof onboardingSchema>;
