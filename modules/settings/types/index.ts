import { z } from 'zod';
import { infoSchema, aiConfigSchema, capacitySchema } from '../schema';

/**
 * Types for the settings module.
 */

export type InfoFormData = z.infer<typeof infoSchema>;
export type AIConfigFormData = z.infer<typeof aiConfigSchema>;
export type CapacityFormData = z.infer<typeof capacitySchema>;

export interface SettingsFormState {
  error: string | null;
  fieldErrors?: Record<string, string[]>;
  success: boolean;
  message?: string;
}

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export type TierId = 'free' | 'starter' | 'professional' | 'enterprise';

export type AIPersonality = 'friendly' | 'formal' | 'efficient';

export interface RestaurantSettings {
  tier: TierId;
  ai: {
    allowReservations: boolean;
    allowOrders: boolean;
    customInstructions: string;
    greeting: string;
    personality: AIPersonality;
  };
  capacity: {
    maxPartySize: number;
    operatingHours: OperatingHours;
  };
}

export interface SettingsTabProps {
  restaurantId: string;
}

export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type DayOfWeek = typeof DAYS_OF_WEEK[number];
