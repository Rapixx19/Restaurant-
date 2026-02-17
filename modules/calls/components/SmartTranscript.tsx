'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import type { LanguageSegment, TranscriptMessage } from '../types';
import { getLanguageConfig, LANGUAGE_CONFIGS } from '../types';

interface SmartTranscriptProps {
  transcript?: TranscriptMessage[];
  languageSegments?: LanguageSegment[];
  className?: string;
}

interface SegmentWithLanguage {
  text: string;
  language: string;
  role?: string;
}

/**
 * SmartTranscript Component
 *
 * Displays call transcripts with color-coded language segments.
 * Each segment shows a subtle background color based on the detected language,
 * with a hover tooltip showing the language tag.
 */
export function SmartTranscript({
  transcript,
  languageSegments,
  className,
}: SmartTranscriptProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // If no transcript data, show empty state
  if ((!transcript || transcript.length === 0) && (!languageSegments || languageSegments.length === 0)) {
    return (
      <div className={cn('text-gray-500 text-sm', className)}>
        No transcript available
      </div>
    );
  }

  // Build segments from language_segments if available, otherwise from transcript
  const segments: SegmentWithLanguage[] = languageSegments && languageSegments.length > 0
    ? languageSegments.map((seg) => ({
        text: seg.text,
        language: seg.language,
      }))
    : (transcript || []).map((msg) => ({
        text: msg.content,
        language: msg.language || 'en',
        role: msg.role,
      }));

  // Get unique languages in the conversation
  const uniqueLanguages = Array.from(new Set(segments.map((s) => s.language)));

  return (
    <div className={cn('w-full', className)}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
        <span>{isExpanded ? 'Hide Transcript' : 'View Smart Transcript'}</span>
        {uniqueLanguages.length > 1 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">
            <Globe className="w-3 h-3" />
            {uniqueLanguages.length} languages
          </span>
        )}
      </button>

      {/* Language Legend */}
      {isExpanded && uniqueLanguages.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {uniqueLanguages.map((lang) => {
            const config = getLanguageConfig(lang);
            return (
              <div
                key={lang}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
                  config.bgColor,
                  config.textColor
                )}
              >
                <span>{config.flag}</span>
                <span>{config.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Transcript Content */}
      {isExpanded && (
        <div className="mt-3 p-4 bg-slate-900/50 rounded-lg border border-slate-800 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {segments.map((segment, idx) => {
              const config = getLanguageConfig(segment.language);
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={idx}
                  className="relative"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Role Label (if from transcript) */}
                  {segment.role && (
                    <div className="text-xs text-gray-500 mb-1 capitalize">
                      {segment.role === 'assistant' ? 'AI Assistant' : 'Customer'}
                    </div>
                  )}

                  {/* Segment Text with Language Highlight */}
                  <div
                    className={cn(
                      'relative px-3 py-2 rounded-lg transition-all duration-200',
                      config.bgColor,
                      segment.role === 'assistant' ? 'ml-4 border-l-2 border-electric-blue/30' : 'mr-4'
                    )}
                  >
                    <p className="text-sm text-gray-200 leading-relaxed">
                      {segment.text}
                    </p>

                    {/* Language Tag on Hover */}
                    {isHovered && (
                      <div
                        className={cn(
                          'absolute -top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium shadow-lg z-10',
                          'bg-slate-800 border border-slate-700',
                          config.textColor
                        )}
                      >
                        <span>{config.flag}</span>
                        <span>{config.code.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * LanguageTag Component
 *
 * A small inline tag showing the language code with appropriate styling.
 */
export function LanguageTag({ language, className }: { language: string; className?: string }) {
  const config = getLanguageConfig(language);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
        config.bgColor,
        config.textColor,
        className
      )}
    >
      <span>{config.flag}</span>
      <span>{config.code.toUpperCase()}</span>
    </span>
  );
}

/**
 * SafeSmartTranscript Component
 *
 * SmartTranscript wrapped with ErrorBoundary to prevent crashes
 * from breaking the entire dashboard.
 */
export function SafeSmartTranscript(props: SmartTranscriptProps) {
  return (
    <ErrorBoundary
      componentName="SmartTranscript"
      fallback={
        <div className="text-gray-500 text-sm">
          Unable to display transcript
        </div>
      }
    >
      <SmartTranscript {...props} />
    </ErrorBoundary>
  );
}
