'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageData {
  language: string;
  count: number;
  name: string;
  flag: string;
}

interface LanguageDistributionChartProps {
  data: LanguageData[];
  className?: string;
}

const LANGUAGE_COLORS: Record<string, string> = {
  en: '#3b82f6', // blue
  es: '#eab308', // yellow
  fr: '#6366f1', // indigo
  de: '#f59e0b', // amber
  it: '#22c55e', // green
  pt: '#10b981', // emerald
  zh: '#ef4444', // red
  ja: '#ec4899', // pink
  ko: '#0ea5e9', // sky
  ar: '#14b8a6', // teal
  hi: '#f97316', // orange
  ru: '#06b6d4', // cyan
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: LanguageData; value: number }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{data.flag}</span>
        <span className="text-white font-medium">{data.name}</span>
      </div>
      <p className="text-gray-400 text-sm">{data.count} calls</p>
    </div>
  );
}

interface CustomLegendProps {
  payload?: Array<{
    value: string;
    color: string;
    payload: { payload: LanguageData };
  }>;
}

function CustomLegend({ payload }: CustomLegendProps) {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap justify-center gap-3 mt-4">
      {payload.map((entry, index) => {
        const data = entry.payload.payload;
        return (
          <div key={index} className="flex items-center gap-1.5 text-sm">
            <span className="text-base">{data.flag}</span>
            <span className="text-gray-400">{data.name}</span>
            <span className="text-white font-medium">({data.count})</span>
          </div>
        );
      })}
    </div>
  );
}

export function LanguageDistributionChart({ data, className }: LanguageDistributionChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className={cn('rounded-xl bg-slate-900/50 border border-slate-800 p-6', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-medium text-gray-400">Language Distribution</h3>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800/50 flex items-center justify-center">
              <Globe className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-gray-400 text-sm">No call language data yet</p>
          </div>
        </div>
      </div>
    );
  }

  const totalCalls = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className={cn('rounded-xl bg-slate-900/50 border border-slate-800 p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-medium text-gray-400">Language Distribution</h3>
        </div>
        <span className="text-sm text-gray-500">{totalCalls} total calls</span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="count"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={LANGUAGE_COLORS[entry.language] || '#64748b'}
                  stroke="transparent"
                  style={{
                    filter: activeIndex === index ? 'brightness(1.2)' : 'none',
                    transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'center',
                    transition: 'all 0.2s ease-out',
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
