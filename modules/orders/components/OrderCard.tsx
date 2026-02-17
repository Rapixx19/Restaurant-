'use client';

import { useState, useTransition } from 'react';
import type { Order } from '@/lib/database.types';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  TYPE_LABELS,
  type OrderStatus,
  type OrderType,
  type OrderItem,
} from '../types';

interface OrderCardProps {
  order: Order;
  onStatusChange: (id: string, status: OrderStatus) => Promise<void>;
}

export function OrderCard({ order, onStatusChange }: OrderCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showActions, setShowActions] = useState(false);

  const items = (order.items as unknown as OrderItem[]) || [];

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTimeSinceOrder = (dateStr: string) => {
    const orderTime = new Date(dateStr).getTime();
    const now = Date.now();
    const minutes = Math.floor((now - orderTime) / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return minutes + ' min ago';
    const hours = Math.floor(minutes / 60);
    return hours + 'h ' + (minutes % 60) + 'm ago';
  };

  const handleStatusChange = (newStatus: OrderStatus) => {
    startTransition(async () => {
      await onStatusChange(order.id, newStatus);
      setShowActions(false);
    });
  };

  const getAvailableActions = (): { status: OrderStatus; label: string }[] => {
    const actions: { status: OrderStatus; label: string }[] = [];

    switch (order.status) {
      case 'confirmed':
        actions.push({ status: 'preparing', label: 'Start Preparing' });
        break;
      case 'preparing':
        actions.push({ status: 'ready', label: 'Mark Ready' });
        break;
      case 'ready':
        actions.push({ status: 'completed', label: 'Complete Order' });
        break;
      default:
        break;
    }

    return actions;
  };

  const availableActions = getAvailableActions();

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <span className={'px-2 py-1 text-xs font-bold rounded ' + STATUS_COLORS[order.status]}>
            {STATUS_LABELS[order.status]}
          </span>
          <span className="px-2 py-1 text-xs font-medium bg-slate-700 text-slate-300 rounded">
            {TYPE_LABELS[order.type as OrderType]}
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-white">{formatTime(order.created_at)}</div>
          <div className="text-xs text-slate-400">{getTimeSinceOrder(order.created_at)}</div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-slate-700/50">
        <div className="font-semibold text-white">{order.customer_name}</div>
        <div className="text-sm text-slate-400">{order.customer_phone}</div>
      </div>

      <div className="p-4 space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between items-start">
            <div className="flex-1">
              <div className="text-white">
                <span className="font-medium text-blue-400">{item.quantity}x</span>{' '}
                {item.name}
              </div>
              {item.notes && (
                <div className="text-sm text-yellow-400 mt-0.5">Note: {item.notes}</div>
              )}
            </div>
            <div className="text-sm text-slate-400">{'$' + item.line_total.toFixed(2)}</div>
          </div>
        ))}

        {order.special_instructions && (
          <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-sm text-yellow-400">
            <strong>Special Instructions:</strong> {order.special_instructions}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-t border-slate-700">
        <div className="text-lg font-bold text-white">{'$' + order.total.toFixed(2)}</div>

        {availableActions.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              disabled={isPending}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {isPending ? 'Updating...' : 'Update Status'}
            </button>

            {showActions && !isPending && (
              <div className="absolute right-0 bottom-full mb-2 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-10 min-w-[150px]">
                {availableActions.map((action) => (
                  <button
                    key={action.status}
                    onClick={() => handleStatusChange(action.status)}
                    className="w-full px-4 py-2 text-sm text-left text-white hover:bg-slate-700 first:rounded-t-md last:rounded-b-md transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
