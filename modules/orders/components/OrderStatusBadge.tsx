'use client';

import { cn } from '@/lib/utils';
import type { OrderStatus } from '../types';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  pending: {
    label: 'Pending',
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/50',
  },
  confirmed: {
    label: 'NEW',
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/50',
  },
  preparing: {
    label: 'IN KITCHEN',
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/50',
  },
  ready: {
    label: 'READY',
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500/50',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    border: 'border-gray-500/50',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/50',
  },
};

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export function OrderStatusBadge({
  status,
  size = 'md',
  pulse = false,
  className,
}: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-bold rounded-md border',
        config.bg,
        config.text,
        config.border,
        SIZE_CLASSES[size],
        className
      )}
    >
      {pulse && (
        <span
          className={cn(
            'w-2 h-2 rounded-full animate-pulse',
            status === 'confirmed' && 'bg-blue-400',
            status === 'preparing' && 'bg-purple-400',
            status === 'ready' && 'bg-green-400'
          )}
        />
      )}
      {config.label}
    </span>
  );
}
