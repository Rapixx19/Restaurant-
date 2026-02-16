import { z } from 'zod';

/**
 * Schema for Info tab.
 */
export const infoSchema = z.object({
  name: z
    .string()
    .min(2, 'Restaurant name must be at least 2 characters')
    .max(100, 'Restaurant name must be less than 100 characters'),

  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),

  phone: z
    .string()
    .optional()
    .or(z.literal('')),

  email: z
    .string()
    .email('Please enter a valid email')
    .optional()
    .or(z.literal('')),

  website: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),

  street: z
    .string()
    .min(5, 'Street address is required'),

  city: z
    .string()
    .min(2, 'City is required'),

  state: z
    .string()
    .min(2, 'State/Province is required'),

  zip: z
    .string()
    .min(3, 'ZIP/Postal code is required'),

  country: z
    .string()
    .min(2, 'Country is required'),
});

/**
 * Schema for AI Config tab.
 */
export const aiConfigSchema = z.object({
  allowReservations: z.boolean(),
  allowOrders: z.boolean(),
  customInstructions: z
    .string()
    .max(2000, 'Instructions must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
});

/**
 * Schema for day hours.
 */
const dayHoursSchema = z.object({
  open: z.string(),
  close: z.string(),
  closed: z.boolean(),
});

/**
 * Schema for Capacity tab.
 */
export const capacitySchema = z.object({
  maxPartySize: z
    .number()
    .min(1, 'Minimum party size is 1')
    .max(100, 'Maximum party size is 100'),

  operatingHours: z.object({
    monday: dayHoursSchema,
    tuesday: dayHoursSchema,
    wednesday: dayHoursSchema,
    thursday: dayHoursSchema,
    friday: dayHoursSchema,
    saturday: dayHoursSchema,
    sunday: dayHoursSchema,
  }),
});
