/**
 * Call Logs Module Types
 */

export interface LanguageSegment {
  start: number;
  end: number;
  text: string;
  language: string;
  confidence: number;
}

export interface TranscriptMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  language?: string;
}

export interface CallLog {
  id: string;
  restaurant_id: string;
  call_id: string;
  assistant_id?: string;
  phone_number?: string;
  caller_phone?: string;
  direction: 'inbound' | 'outbound';
  status: 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer';
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  transcript?: TranscriptMessage[];
  language_segments?: LanguageSegment[];
  language_detected?: string;
  summary?: string;
  recording_url?: string;
  reservation_id?: string;
  order_id?: string;
  customer_name?: string;
  customer_phone?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  intent?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LanguageConfig {
  code: string;
  name: string;
  flag: string;
  bgColor: string;
  textColor: string;
}

export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  en: { code: 'en', name: 'English', flag: '🇺🇸', bgColor: 'bg-blue-500/10', textColor: 'text-blue-400' },
  es: { code: 'es', name: 'Spanish', flag: '🇪🇸', bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-400' },
  fr: { code: 'fr', name: 'French', flag: '🇫🇷', bgColor: 'bg-indigo-500/10', textColor: 'text-indigo-400' },
  de: { code: 'de', name: 'German', flag: '🇩🇪', bgColor: 'bg-amber-500/10', textColor: 'text-amber-400' },
  it: { code: 'it', name: 'Italian', flag: '🇮🇹', bgColor: 'bg-green-500/10', textColor: 'text-green-400' },
  pt: { code: 'pt', name: 'Portuguese', flag: '🇵🇹', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-400' },
  zh: { code: 'zh', name: 'Chinese', flag: '🇨🇳', bgColor: 'bg-red-500/10', textColor: 'text-red-400' },
  ja: { code: 'ja', name: 'Japanese', flag: '🇯🇵', bgColor: 'bg-pink-500/10', textColor: 'text-pink-400' },
  ko: { code: 'ko', name: 'Korean', flag: '🇰🇷', bgColor: 'bg-sky-500/10', textColor: 'text-sky-400' },
  ar: { code: 'ar', name: 'Arabic', flag: '🇸🇦', bgColor: 'bg-teal-500/10', textColor: 'text-teal-400' },
  hi: { code: 'hi', name: 'Hindi', flag: '🇮🇳', bgColor: 'bg-orange-500/10', textColor: 'text-orange-400' },
  ru: { code: 'ru', name: 'Russian', flag: '🇷🇺', bgColor: 'bg-cyan-500/10', textColor: 'text-cyan-400' },
};

export const SUPPORTED_AI_LANGUAGES = ['en', 'es', 'fr', 'de'];

export function getLanguageConfig(code: string): LanguageConfig {
  return LANGUAGE_CONFIGS[code] || {
    code,
    name: code.toUpperCase(),
    flag: '🌐',
    bgColor: 'bg-gray-500/10',
    textColor: 'text-gray-400',
  };
}
