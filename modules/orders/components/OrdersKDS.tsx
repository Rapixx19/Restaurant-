'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  Clock,
  User,
  Phone,
  ChefHat,
  CheckCircle,
  Package,
  AlertCircle,
  RefreshCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  type: 'dine_in' | 'takeout' | 'delivery';
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'paid' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  source: string;
  special_instructions: string | null;
  estimated_ready_at: string | null;
  created_at: string;
}

interface OrdersKDSProps {
  restaurantId: string;
  initialOrders: Order[];
}

const STATUS_CONFIG = {
  paid: {
    label: 'New Order',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    borderColor: 'border-green-400/30',
    icon: AlertCircle,
  },
  preparing: {
    label: 'Preparing',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/30',
    icon: ChefHat,
  },
  ready: {
    label: 'Ready',
    color: 'text-electric-blue',
    bgColor: 'bg-electric-blue/10',
    borderColor: 'border-electric-blue/30',
    icon: Package,
  },
  completed: {
    label: 'Completed',
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
    borderColor: 'border-gray-400/30',
    icon: CheckCircle,
  },
};

const ORDER_TYPE_LABELS = {
  dine_in: 'Dine In',
  takeout: 'Takeout',
  delivery: 'Delivery',
};

export function OrdersKDS({ restaurantId, initialOrders }: OrdersKDSProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'preparing' | 'ready'>('all');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const supabase = createClient();

  // Initialize audio
  useEffect(() => {
    // Create audio element for notification sound
    audioRef.current = new Audio('/sounds/new-order.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }, [soundEnabled]);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    // Use raw query to avoid type issues with 'paid' status not in generated types
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .or('status.eq.paid,status.eq.preparing,status.eq.ready')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } else {
      setOrders((data as unknown as Order[]) || []);
    }
    setIsLoading(false);
  }, [restaurantId, supabase]);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('orders-kds')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            if (newOrder.status === 'paid') {
              setOrders((prev) => [...prev, newOrder]);
              playNotificationSound();
              toast.success('New Order!', {
                description: `${newOrder.customer_name} - ${ORDER_TYPE_LABELS[newOrder.type]}`,
                duration: 10000,
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order;
            if (['paid', 'preparing', 'ready'].includes(updatedOrder.status)) {
              setOrders((prev) =>
                prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
              );
              // Play sound for status changes to "paid"
              if (updatedOrder.status === 'paid') {
                playNotificationSound();
                toast.success('New Order!', {
                  description: `${updatedOrder.customer_name} - ${ORDER_TYPE_LABELS[updatedOrder.type]}`,
                  duration: 10000,
                });
              }
            } else {
              // Remove completed/cancelled orders from view
              setOrders((prev) => prev.filter((o) => o.id !== updatedOrder.id));
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

  // Fetch on mount
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Update order status
  const updateStatus = async (
    orderId: string,
    newStatus: 'preparing' | 'ready' | 'completed'
  ) => {
    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'preparing') {
      updates.estimated_ready_at = new Date(
        Date.now() + 30 * 60 * 1000
      ).toISOString();
    }

    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to update order status');
      console.error('Error updating order:', error);
    } else {
      toast.success(`Order marked as ${newStatus}`);
    }
  };

  // Format price
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Calculate time since order
  const getTimeSince = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  // Filter orders
  const filteredOrders = orders.filter((o) =>
    statusFilter === 'all' ? true : o.status === statusFilter
  );

  // Group orders by status for KDS view
  const paidOrders = filteredOrders.filter((o) => o.status === 'paid');
  const preparingOrders = filteredOrders.filter((o) => o.status === 'preparing');
  const readyOrders = filteredOrders.filter((o) => o.status === 'ready');

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
          >
            <RefreshCw className={cn('w-5 h-5', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              'p-2 rounded-lg border transition-colors',
              soundEnabled
                ? 'bg-electric-blue/10 border-electric-blue/30 text-electric-blue'
                : 'bg-white/5 border-white/10 text-gray-400'
            )}
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'paid', 'preparing', 'ready'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                statusFilter === status
                  ? 'bg-electric-blue text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              )}
            >
              {status === 'all'
                ? 'All'
                : STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].label}
              {status !== 'all' && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/10 text-xs">
                  {status === 'paid'
                    ? paidOrders.length
                    : status === 'preparing'
                      ? preparingOrders.length
                      : readyOrders.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
          <p className="text-sm text-green-400">New Orders</p>
          <p className="text-3xl font-bold text-white">{paidOrders.length}</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
          <p className="text-sm text-yellow-400">Preparing</p>
          <p className="text-3xl font-bold text-white">{preparingOrders.length}</p>
        </div>
        <div className="bg-electric-blue/10 border border-electric-blue/20 rounded-xl p-4 text-center">
          <p className="text-sm text-electric-blue">Ready</p>
          <p className="text-3xl font-bold text-white">{readyOrders.length}</p>
        </div>
      </div>

      {/* Orders Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-electric-blue" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-card border border-white/10 rounded-xl p-12 text-center">
          <ChefHat className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No active orders</h3>
          <p className="text-gray-400">New orders will appear here in real-time</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const config = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG];
            if (!config) return null;
            const StatusIcon = config.icon;

            return (
              <div
                key={order.id}
                className={cn(
                  'bg-card border-2 rounded-xl p-4 transition-all',
                  config.borderColor,
                  order.status === 'paid' && 'animate-pulse'
                )}
              >
                {/* Order Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                          config.bgColor,
                          config.color
                        )}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                      <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                        {ORDER_TYPE_LABELS[order.type]}
                      </span>
                      {order.source === 'ai' && (
                        <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                          AI
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      {order.customer_name}
                    </h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {order.customer_phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">
                      {formatPrice(order.total)}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {getTimeSince(order.created_at)}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-2 mb-4 bg-white/5 rounded-lg p-3">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between text-sm"
                    >
                      <div>
                        <span className="text-white font-medium">
                          {item.quantity}x {item.name}
                        </span>
                        {item.notes && (
                          <p className="text-xs text-gray-400 italic">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <span className="text-gray-400">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Special Instructions */}
                {order.special_instructions && (
                  <div className="mb-4 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-xs text-yellow-400 font-medium mb-1">
                      Special Instructions:
                    </p>
                    <p className="text-sm text-white">
                      {order.special_instructions}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {order.status === 'paid' && (
                    <button
                      onClick={() => updateStatus(order.id, 'preparing')}
                      className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <ChefHat className="w-4 h-4" />
                      Start Preparing
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateStatus(order.id, 'ready')}
                      className="flex-1 px-4 py-2 bg-electric-blue hover:bg-electric-blue-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      Mark Ready
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      onClick={() => updateStatus(order.id, 'completed')}
                      className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Complete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
