'use client';

import { AlertTriangle, TrendingUp, Globe, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageOpportunity {
  language: string;
  name: string;
  flag: string;
  callCount: number;
  isSupported: boolean;
}

interface MissedLanguageOpportunitiesProps {
  opportunities: LanguageOpportunity[];
  supportedLanguages: string[];
  className?: string;
}

/**
 * MissedLanguageOpportunities Component
 *
 * Displays insights about languages customers speak that the AI
 * isn't yet optimized for, helping identify expansion opportunities.
 */
export function MissedLanguageOpportunities({
  opportunities,
  supportedLanguages,
  className,
}: MissedLanguageOpportunitiesProps) {
  const missedOpportunities = opportunities.filter((o) => !o.isSupported && o.callCount > 0);
  const supportedUsed = opportunities.filter((o) => o.isSupported && o.callCount > 0);

  const totalMissedCalls = missedOpportunities.reduce((sum, o) => sum + o.callCount, 0);
  const totalCalls = opportunities.reduce((sum, o) => sum + o.callCount, 0);
  const missedPercentage = totalCalls > 0 ? Math.round((totalMissedCalls / totalCalls) * 100) : 0;

  // No data state
  if (opportunities.length === 0 || totalCalls === 0) {
    return (
      <div className={cn('rounded-xl bg-slate-900/50 border border-slate-800 p-6', className)}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-orange-400" />
          <h3 className="text-sm font-medium text-gray-400">Language Opportunities</h3>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <Globe className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Start receiving calls to see opportunities</p>
          </div>
        </div>
      </div>
    );
  }

  // All languages supported state
  if (missedOpportunities.length === 0) {
    return (
      <div className={cn('rounded-xl bg-slate-900/50 border border-slate-800 p-6', className)}>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <h3 className="text-sm font-medium text-gray-400">Language Coverage</h3>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-green-400 font-medium">Excellent Coverage!</p>
            <p className="text-gray-400 text-sm mt-1">
              Your AI supports all detected customer languages
            </p>
          </div>
        </div>

        {/* Supported Languages Used */}
        {supportedUsed.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-gray-500 mb-2">Active languages</p>
            <div className="flex flex-wrap gap-2">
              {supportedUsed.map((lang) => (
                <span
                  key={lang.language}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 text-green-400 text-xs"
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                  <span className="text-green-400/60">({lang.callCount})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl bg-slate-900/50 border border-slate-800 p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          <h3 className="text-sm font-medium text-gray-400">Missed Language Opportunities</h3>
        </div>
        <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full">
          {missedPercentage}% of calls
        </span>
      </div>

      {/* Alert Banner */}
      <div className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
        <p className="text-sm text-orange-400">
          <strong>{totalMissedCalls} calls</strong> were in languages your AI isn&apos;t optimized for.
          Consider adding support to improve customer experience.
        </p>
      </div>

      {/* Missed Languages List */}
      <div className="space-y-3">
        {missedOpportunities
          .sort((a, b) => b.callCount - a.callCount)
          .map((lang) => {
            const percentage = Math.round((lang.callCount / totalCalls) * 100);

            return (
              <div key={lang.language} className="flex items-center gap-3">
                <span className="text-xl">{lang.flag}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white">{lang.name}</span>
                    <span className="text-xs text-gray-400">
                      {lang.callCount} calls ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Currently Supported */}
      {supportedUsed.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-xs text-gray-500 mb-2">Currently supported</p>
          <div className="flex flex-wrap gap-2">
            {supportedUsed.map((lang) => (
              <span
                key={lang.language}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 text-green-400 text-xs"
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Suggestion */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <p className="text-xs text-gray-500">
          Add language support in{' '}
          <span className="text-electric-blue">Settings → Voice → Languages</span>
        </p>
      </div>
    </div>
  );
}
