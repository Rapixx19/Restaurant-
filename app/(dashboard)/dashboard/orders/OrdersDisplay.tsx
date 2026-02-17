'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Order } from '@/lib/database.types';
import { OrderCard } from '@/modules/orders';
import type { OrderStatus } from '@/modules/orders/types';

interface OrdersDisplayProps {
  restaurantId: string;
  initialOrders: Order[];
}

export function OrdersDisplay({ restaurantId, initialOrders }: OrdersDisplayProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const supabase = createClient();

  // Play notification sound for new orders
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;

    try {
      // Create audio element if not exists
      if (!audioRef.current) {
        audioRef.current = new Audio();
        // Use a simple beep - can be replaced with a custom sound file
        audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGcbGFB4oL/NsmgjIkx3mLXCrmwlI0p0lbLBr3EmJEpzk7DAr3InJUpyk7C/r3MoJUlxkq+/r3QpJUlwka6+r3UqJUhvka2+r3YqJUhuka2+r3crJUdtj6y9rngsJUZsj6y9rnktJUZrjqu8rnotJUVqjaq8rXsuJUVpjKq8rXwvJURojKm7rHwwJURnjKm7rH0wJUNmiqm7rH4xJUNliqe6q34yJUJkiaW6qn8zJUJjh6S5qX80JUFihqO4qIA1JUBhhaK3poA2JT9ghaK3poA2JT9fhKG2pYA3JT5eg6C1pYA4JT5dgp+0o4A5JT1cgZ6zooA6JT1bgZ2yoYE7JTxagJyxoIE8JTtZf5uwn4E9JTpYfpmvnYE+JTpXfZiunIFAJTlWfJetnIFBJThVe5asmYFCJThUepWrmYJDJTdTd5SpmIJEJTZSdpOnl4JFJTZRdZGml4JHJTVQNI+klYNIJTROcI6jlINJJTNNb42ikINKJTNMboyhjINLJTJLbYqgjYNNJTFKbIifioNOJTBJa4eeiYNPJTBIaoaehoNQJS9HaYWchoRSJS5GaIOahIRTJC1FZ4KZg4RUJS1EZoCXgYRVJSxDZH+WgIVXJStCY32Vf4VYJSpBYnuTfYVZJSpAYXqSfIZbJSk/YHiQeoZcJSg+X3ePeYZdJSg9XnWNeIZfJSc8XXSMd4ZgJSY7XHKKdodhJSY6W3GJdYdiJSU5Wm+HdIdkJSQ4WWyFcodyJSM3WGuEcId0JSI2V2mCboh1JSE1VmiBbYh3JSA0VWZ/a4h4JR8zVGV+aol6JR4yU2R8aIl8JR0xUmJ6Zol9JRwwUWF5ZYl/JRsvUF93Y4qAJRovT154YoqCJRkvTlx2YIqDJRguTVt1X4uFJRctTFl0XYuGJRYsTFhyW4uIJRUrS1dxWouJJRQqSlZwWYuLJRQpSVRuV4uMJRMoSFNtVouOJRInR1FsVIuPJREmRlBqU4yRJRAlRU9pUYySJQ8kRE5oUIyUJQ4jQ0xmToyVJQ0iQktlTY2XJQwhQUpjS42YJQsgQEliSo2aJQofP0hhSI2bJQke';
      }
      audioRef.current.play().catch(console.error);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [soundEnabled]);

  // Set up Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('orders:' + restaurantId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: 'restaurant_id=eq.' + restaurantId,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            // Only add paid orders to the display
            if (['confirmed', 'preparing', 'ready'].includes(newOrder.status)) {
              setOrders((prev) => {
                const exists = prev.some((o) => o.id === newOrder.id);
                if (exists) return prev;
                playNotificationSound();
                return [...prev, newOrder].sort(
                  (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order;
            if (updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled') {
              // Remove completed/cancelled orders from display
              setOrders((prev) => prev.filter((o) => o.id !== updatedOrder.id));
            } else if (['confirmed', 'preparing', 'ready'].includes(updatedOrder.status)) {
              // Check if this is a new paid order (status changed from pending to confirmed)
              setOrders((prev) => {
                const existingIndex = prev.findIndex((o) => o.id === updatedOrder.id);
                if (existingIndex === -1) {
                  // New paid order
                  playNotificationSound();
                  return [...prev, updatedOrder].sort(
                    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  );
                }
                // Update existing order
                return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id?: string })?.id;
            if (deletedId) {
              setOrders((prev) => prev.filter((o) => o.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, supabase, playNotificationSound]);

  const handleStatusChange = async (id: string, newStatus: OrderStatus) => {
    // Use API route to handle status update + notifications
    const response = await fetch('/api/orders/' + id + '/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error updating order:', error);
      throw new Error(error.error || 'Failed to update order');
    }

    // Optimistic update (realtime will confirm)
    if (newStatus === 'completed' || newStatus === 'cancelled') {
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } else {
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
      );
    }
  };

  // Group orders by status
  const confirmedOrders = orders.filter((o) => o.status === 'confirmed');
  const preparingOrders = orders.filter((o) => o.status === 'preparing');
  const readyOrders = orders.filter((o) => o.status === 'ready');

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-400">
            {orders.length} active order{orders.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={'px-4 py-2 text-sm rounded-md transition-colors ' + (soundEnabled ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300')}
        >
          {soundEnabled ? 'Sound On' : 'Sound Off'}
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/30 border border-slate-700 rounded-lg">
          <div className="text-2xl text-slate-400 mb-2">No active orders</div>
          <p className="text-slate-500">New paid orders will appear here in real-time</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* New Orders Column */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></span>
              New Orders ({confirmedOrders.length})
            </h2>
            <div className="space-y-4">
              {confirmedOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </div>

          {/* Preparing Column */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
              <span className="w-3 h-3 bg-purple-400 rounded-full"></span>
              Preparing ({preparingOrders.length})
            </h2>
            <div className="space-y-4">
              {preparingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </div>

          {/* Ready Column */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-green-400 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-400 rounded-full"></span>
              Ready ({readyOrders.length})
            </h2>
            <div className="space-y-4">
              {readyOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
