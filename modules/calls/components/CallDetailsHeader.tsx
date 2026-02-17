'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Phone, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CallLog, LanguageSegment } from '../types';
import { getLanguageConfig } from '../types';

interface CallDetailsHeaderProps {
  call: CallLog;
  className?: string;
}

interface LanguageBreakdown {
  language: string;
  percentage: number;
  duration: number;
}

/**
 * Calculate language breakdown from segments
 */
function calculateLanguageBreakdown(segments?: LanguageSegment[]): LanguageBreakdown[] {
  if (!segments || segments.length === 0) {
    return [{ language: 'en', percentage: 100, duration: 0 }];
  }

  const languageDurations: Record<string, number> = {};
  let totalDuration = 0;

  segments.forEach((seg) => {
    const duration = seg.end - seg.start;
    languageDurations[seg.language] = (languageDurations[seg.language] || 0) + duration;
    totalDuration += duration;
  });

  if (totalDuration === 0) {
    return [{ language: 'en', percentage: 100, duration: 0 }];
  }

  return Object.entries(languageDurations)
    .map(([language, duration]) => ({
      language,
      percentage: Math.round((duration / totalDuration) * 100),
      duration,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

/**
 * Sentiment Badge Component
 *
 * High-visibility indicator for customer mood
 */
function SentimentBadge({ sentiment }: { sentiment?: string }) {
  const configs = {
    positive: {
      bg: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20',
      border: 'border-green-500/30',
      text: 'text-green-400',
      icon: '😊',
      label: 'Happy Customer',
    },
    neutral: {
      bg: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20',
      border: 'border-gray-500/30',
      text: 'text-gray-400',
      icon: '😐',
      label: 'Neutral',
    },
    negative: {
      bg: 'bg-gradient-to-r from-red-500/20 to-orange-500/20',
      border: 'border-red-500/30',
      text: 'text-red-400',
      icon: '😤',
      label: 'Frustrated',
    },
  };

  const config = configs[sentiment as keyof typeof configs] || configs.neutral;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-xl border',
        config.bg,
        config.border
      )}
    >
      <span className="text-2xl">{config.icon}</span>
      <div>
        <p className={cn('text-sm font-semibold', config.text)}>Customer Mood</p>
        <p className={cn('text-xs', config.text)}>{config.label}</p>
      </div>
    </div>
  );
}

/**
 * Language Breakdown Bar Component
 *
 * Visual horizontal bar showing percentage of each language
 */
function LanguageBreakdownBar({ breakdown }: { breakdown: LanguageBreakdown[] }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Language Distribution</span>
        <div className="flex items-center gap-2">
          {breakdown.map((item) => {
            const config = getLanguageConfig(item.language);
            return (
              <span
                key={item.language}
                className={cn('text-xs flex items-center gap-1', config.textColor)}
              >
                {config.flag} {item.percentage}%
              </span>
            );
          })}
        </div>
      </div>

      {/* Stacked Bar */}
      <div className="h-3 rounded-full overflow-hidden flex bg-slate-800">
        {breakdown.map((item, idx) => {
          const config = getLanguageConfig(item.language);
          // Extract the color from bgColor (e.g., "bg-blue-500/10" -> "bg-blue-500")
          const solidBg = config.bgColor.replace('/10', '').replace('bg-', 'bg-');

          return (
            <div
              key={item.language}
              className={cn(
                'h-full transition-all duration-500',
                idx === 0 ? 'rounded-l-full' : '',
                idx === breakdown.length - 1 ? 'rounded-r-full' : '',
                // Use solid colors for the bar
                item.language === 'en' && 'bg-blue-500',
                item.language === 'es' && 'bg-yellow-500',
                item.language === 'fr' && 'bg-indigo-500',
                item.language === 'de' && 'bg-amber-500',
                item.language === 'it' && 'bg-green-500',
                item.language === 'pt' && 'bg-emerald-500',
                item.language === 'zh' && 'bg-red-500',
                item.language === 'ja' && 'bg-pink-500',
                item.language === 'ko' && 'bg-sky-500',
                item.language === 'ar' && 'bg-teal-500',
                item.language === 'hi' && 'bg-orange-500',
                item.language === 'ru' && 'bg-cyan-500',
                !['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar', 'hi', 'ru'].includes(item.language) && 'bg-gray-500'
              )}
              style={{ width: `${item.percentage}%` }}
              title={`${config.name}: ${item.percentage}%`}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Waveform Audio Player Component
 *
 * Custom audio player with waveform visualization
 */
function WaveformAudioPlayer({ url }: { url?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveformData] = useState(() =>
    // Generate random waveform data for visual effect
    Array.from({ length: 50 }, () => Math.random() * 0.8 + 0.2)
  );

  useEffect(() => {
    if (!url) return;

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!url) {
    return (
      <div className="flex items-center justify-center h-16 bg-slate-800/50 rounded-xl text-gray-500 text-sm">
        No recording available
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className={cn(
            'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all',
            'bg-electric-blue hover:bg-electric-blue/80',
            'shadow-lg shadow-electric-blue/20'
          )}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" />
          )}
        </button>

        {/* Waveform Visualization */}
        <div className="flex-1">
          <div
            className="h-10 flex items-center gap-0.5 cursor-pointer"
            onClick={seekTo}
          >
            {waveformData.map((height, idx) => {
              const barProgress = (idx / waveformData.length) * 100;
              const isPlayed = barProgress <= progress;

              return (
                <div
                  key={idx}
                  className={cn(
                    'flex-1 rounded-full transition-colors duration-150',
                    isPlayed ? 'bg-electric-blue' : 'bg-slate-600'
                  )}
                  style={{ height: `${height * 100}%` }}
                />
              );
            })}
          </div>

          {/* Time Display */}
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Mute Button */}
        <button
          onClick={toggleMute}
          className="flex-shrink-0 p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

/**
 * CallDetailsHeader Component
 *
 * Displays comprehensive call information including:
 * - Language breakdown bar
 * - Sentiment badge (Customer Mood indicator)
 * - Audio player with waveform visualization
 */
export function CallDetailsHeader({ call, className }: CallDetailsHeaderProps) {
  const languageBreakdown = calculateLanguageBreakdown(call.language_segments);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Top Row: Call Info & Sentiment */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Call Info */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Phone className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {call.customer_name || 'Unknown Caller'}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(call.started_at)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(call.duration_seconds)}
              </span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  call.direction === 'inbound'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-purple-500/20 text-purple-400'
                )}
              >
                {call.direction}
              </span>
            </div>
          </div>
        </div>

        {/* Sentiment Badge */}
        <SentimentBadge sentiment={call.sentiment} />
      </div>

      {/* Language Breakdown Bar */}
      <LanguageBreakdownBar breakdown={languageBreakdown} />

      {/* Audio Player */}
      <WaveformAudioPlayer url={call.recording_url} />

      {/* Summary */}
      {call.summary && (
        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <p className="text-sm text-gray-400 mb-1">Call Summary</p>
          <p className="text-gray-200">{call.summary}</p>
        </div>
      )}
    </div>
  );
}
