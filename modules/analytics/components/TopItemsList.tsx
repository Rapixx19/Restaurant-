'use client';

import { cn } from '@/lib/utils';

interface TopItem {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface TopItemsListProps {
  items: TopItem[];
  className?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function TopItemsList({ items, className }: TopItemsListProps) {
  if (!items || items.length === 0) {
    return (
      <div className={cn('rounded-xl bg-slate-900/50 border border-slate-800 p-6', className)}>
        <h3 className="text-sm font-medium text-gray-400 mb-4">Top Menu Items</h3>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800/50 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">No orders yet</p>
          </div>
        </div>
      </div>
    );
  }

  const maxQuantity = Math.max(...items.map((i) => i.quantity));

  return (
    <div className={cn('rounded-xl bg-slate-900/50 border border-slate-800 p-6', className)}>
      <h3 className="text-sm font-medium text-gray-400 mb-4">Top Menu Items</h3>
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-400">#{index + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white truncate">{item.name}</p>
                <p className="text-sm text-gray-400 flex-shrink-0 ml-2">
                  {item.quantity} sold
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${(item.quantity / maxQuantity) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 flex-shrink-0">
                  {formatCurrency(item.revenue)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
