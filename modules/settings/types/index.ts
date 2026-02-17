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

export type VoiceStyle = 'warm' | 'professional' | 'energetic';

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
    maxTables: number;
    seatsPerTable: number;
    defaultReservationDuration: number;
    operatingHours: OperatingHours;
  };
  notifications?: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    replyToEmail?: string;
  };
  voice?: {
    enabled: boolean;
    vapiAssistantId?: string;
    vapiPublicKey?: string;
    elevenLabsVoiceId?: string;
    testPhoneNumber?: string;
    smsOnCompletion: boolean;
    primaryLanguage?: string;
    autoLanguageDetection?: boolean;
    vapiPhoneNumberId?: string;
  };
  widget?: {
    primaryColor: string;
    position: 'bottom-right' | 'bottom-left';
    welcomeMessage?: string;
  };
}

// ElevenLabs voice options
export const ELEVENLABS_VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Warm, conversational female' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Professional female' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep, friendly male' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', description: 'Warm, approachable male' },
  { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', description: 'British, elegant female' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'American, confident female' },
] as const;

export type ElevenLabsVoiceId = typeof ELEVENLABS_VOICES[number]['id'];

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

// Supported languages for voice AI
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];
