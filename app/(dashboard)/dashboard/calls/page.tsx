'use client';

import { useState, useEffect } from 'react';
import { Phone, ChevronDown, ChevronUp, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { ActiveCallCard } from '@/modules/calls';
import type { CallLog } from '@/lib/database.types';

// Language flags mapping
const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
  ar: '🇸🇦',
  hi: '🇮🇳',
  ru: '🇷🇺',
};

// Mask phone number for privacy
function maskPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    const last4 = cleaned.slice(-4);
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      return `+1-XXX-XXX-${last4}`;
    }
    return `+XX-XXX-XXX-${last4}`;
  }
  return phone;
}

// Format duration
function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format date
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Sentiment badge component
function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  const config = {
    positive: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Happy' },
    neutral: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Neutral' },
    negative: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Frustrated' },
  };

  const style = config[sentiment as keyof typeof config] || config.neutral;

  return (
    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', style.bg, style.text)}>
      {style.label}
    </span>
  );
}

// Audio player component
function AudioPlayer({ url }: { url: string | null }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (url) {
      const audioElement = new Audio(url);
      audioElement.addEventListener('ended', () => setIsPlaying(false));
      setAudio(audioElement);
      return () => {
        audioElement.pause();
        audioElement.removeEventListener('ended', () => setIsPlaying(false));
      };
    }
  }, [url]);

  const togglePlay = () => {
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (!url) {
    return <span className="text-gray-500 text-sm">No recording</span>;
  }

  return (
    <button
      onClick={togglePlay}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg',
        'bg-electric-blue/20 hover:bg-electric-blue/30',
        'text-electric-blue transition-colors'
      )}
    >
      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      <span className="text-sm">{isPlaying ? 'Pause' : 'Play'}</span>
    </button>
  );
}

// Transcript viewer component
function TranscriptViewer({ transcript }: { transcript: unknown }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
    return <span className="text-gray-500 text-sm">No transcript</span>;
  }

  const messages = transcript as Array<{ role: string; content: string }>;

  return (
    <div className="w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {isExpanded ? 'Hide Transcript' : 'View Transcript'}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2 p-4 bg-white/5 rounded-lg max-h-64 overflow-y-auto">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                'p-2 rounded-lg text-sm',
                msg.role === 'assistant'
                  ? 'bg-electric-blue/10 text-electric-blue ml-4'
                  : 'bg-white/10 text-white mr-4'
              )}
            >
              <span className="font-medium capitalize">{msg.role}: </span>
              {msg.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Call row component
function CallRow({ call }: { call: CallLog }) {
  const languageFlag = LANGUAGE_FLAGS[call.language_detected || 'en'] || '🌐';

  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-all">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        {/* Phone & Language */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Phone className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <p className="font-medium text-white">{maskPhoneNumber(call.caller_phone)}</p>
            <p className="text-sm text-gray-400">{formatDate(call.started_at)}</p>
          </div>
        </div>

        {/* Language Flag */}
        <div className="text-2xl" title={`Language: ${call.language_detected || 'en'}`}>
          {languageFlag}
        </div>

        {/* Duration */}
        <div className="text-sm text-gray-400">
          {formatDuration(call.duration_seconds)}
        </div>

        {/* Sentiment */}
        <SentimentBadge sentiment={call.sentiment} />

        {/* Direction */}
        <span className={cn(
          'px-2 py-1 rounded-full text-xs font-medium',
          call.direction === 'inbound'
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-purple-500/20 text-purple-400'
        )}>
          {call.direction}
        </span>

        {/* Audio Player */}
        <AudioPlayer url={call.recording_url} />
      </div>

      {/* Summary */}
      {call.summary && (
        <p className="text-sm text-gray-300 mb-3 pl-13">{call.summary}</p>
      )}

      {/* Transcript */}
      <div className="pl-13">
        <TranscriptViewer transcript={call.transcript} />
      </div>
    </div>
  );
}

export default function CallHistoryPage() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCalls() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Get restaurant
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!restaurant) {
        setError('No restaurant found');
        setLoading(false);
        return;
      }

      setRestaurantId(restaurant.id);

      // Fetch completed call logs (exclude active calls)
      const { data: callLogs, error: fetchError } = (await supabase
        .from('call_logs')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .neq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(50)) as { data: CallLog[] | null; error: Error | null };

      if (fetchError) {
        setError('Failed to fetch call logs');
        console.error(fetchError);
      } else {
        setCalls(callLogs || []);
      }
      setLoading(false);
    }

    fetchCalls();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <Phone className="w-6 h-6 text-indigo-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Call History</h1>
          <p className="text-gray-400">Review AI phone conversations and recordings</p>
        </div>
      </div>

      {/* Live Calls Section */}
      {restaurantId && <ActiveCallCard restaurantId={restaurantId} />}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-sm text-gray-400">Total Calls</p>
          <p className="text-2xl font-bold text-white">{calls.length}</p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-sm text-gray-400">Happy Callers</p>
          <p className="text-2xl font-bold text-green-400">
            {calls.filter(c => c.sentiment === 'positive').length}
          </p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-sm text-gray-400">Avg Duration</p>
          <p className="text-2xl font-bold text-white">
            {formatDuration(
              calls.length > 0
                ? Math.round(calls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0) / calls.length)
                : 0
            )}
          </p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-sm text-gray-400">Inbound</p>
          <p className="text-2xl font-bold text-blue-400">
            {calls.filter(c => c.direction === 'inbound').length}
          </p>
        </div>
      </div>

      {/* Call List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center">
          {error}
        </div>
      ) : calls.length === 0 ? (
        <div className="p-12 bg-white/5 rounded-xl border border-white/10 text-center">
          <Phone className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No calls yet</h3>
          <p className="text-gray-400">
            When customers call your AI phone assistant, their conversations will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {calls.map((call) => (
            <CallRow key={call.id} call={call} />
          ))}
        </div>
      )}
    </div>
  );
}
