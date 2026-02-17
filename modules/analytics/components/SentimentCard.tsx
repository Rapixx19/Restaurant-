'use client';

import { cn } from '@/lib/utils';

interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
}

interface SentimentCardProps {
  sentiment: SentimentData;
  totalCalls: number;
  className?: string;
}

export function SentimentCard({ sentiment, totalCalls, className }: SentimentCardProps) {
  const total = sentiment.positive + sentiment.neutral + sentiment.negative;

  if (totalCalls === 0 || total === 0) {
    return (
      <div className={cn('rounded-xl bg-slate-900/50 border border-slate-800 p-6', className)}>
        <h3 className="text-sm font-medium text-gray-400 mb-4">Call Sentiment</h3>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800/50 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">No call data yet</p>
          </div>
        </div>
      </div>
    );
  }

  const positivePercent = Math.round((sentiment.positive / total) * 100);
  const neutralPercent = Math.round((sentiment.neutral / total) * 100);
  const negativePercent = Math.round((sentiment.negative / total) * 100);

  // Calculate overall sentiment score (0-100)
  const sentimentScore = Math.round(
    ((sentiment.positive * 100 + sentiment.neutral * 50 + sentiment.negative * 0) / total)
  );

  const getSentimentLabel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-400' };
    if (score >= 60) return { label: 'Good', color: 'text-blue-400' };
    if (score >= 40) return { label: 'Mixed', color: 'text-yellow-400' };
    return { label: 'Needs Attention', color: 'text-red-400' };
  };

  const sentimentInfo = getSentimentLabel(sentimentScore);

  return (
    <div className={cn('rounded-xl bg-slate-900/50 border border-slate-800 p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">Call Sentiment</h3>
        <span className={cn('text-sm font-medium', sentimentInfo.color)}>
          {sentimentInfo.label}
        </span>
      </div>

      {/* Sentiment Score Circle */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="35"
              fill="none"
              stroke="#1e293b"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r="35"
              fill="none"
              stroke={sentimentScore >= 60 ? '#22c55e' : sentimentScore >= 40 ? '#eab308' : '#ef4444'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(sentimentScore / 100) * 220} 220`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-white">{sentimentScore}</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold text-white">{total}</p>
          <p className="text-gray-400 text-sm">Total calls analyzed</p>
        </div>
      </div>

      {/* Sentiment Bars */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Positive
            </span>
            <span className="text-sm text-white">{sentiment.positive} ({positivePercent}%)</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${positivePercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Neutral
            </span>
            <span className="text-sm text-white">{sentiment.neutral} ({neutralPercent}%)</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-400 rounded-full transition-all duration-500"
              style={{ width: `${neutralPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Negative
            </span>
            <span className="text-sm text-white">{sentiment.negative} ({negativePercent}%)</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-500"
              style={{ width: `${negativePercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
