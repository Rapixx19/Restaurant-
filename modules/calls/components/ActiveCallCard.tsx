'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Phone, Wifi, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ActiveCall {
  id: string;
  vapi_call_id: string;
  caller_phone: string;
  started_at: string;
  status: string;
}

interface ActiveCallCardProps {
  restaurantId: string;
}

type LoadingState = 'loading' | 'loaded' | 'error';

// Mask phone number for privacy
function maskPhoneNumber(phone: string | null): string {
  if (!phone) return 'Unknown';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    const last4 = cleaned.slice(-4);
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      return `+1-XXX-XXX-${last4}`;
    }
    return `+XX-XXX-XXX-${last4}`;
  }
  return phone;
}

// Format elapsed time
function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Single active call display
function ActiveCallItem({ call }: { call: ActiveCall }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    // Calculate initial elapsed time
    const startTime = new Date(call.started_at).getTime();
    const now = Date.now();
    setElapsedSeconds(Math.floor((now - startTime) / 1000));

    // Update every second
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [call.started_at]);

  const phoneNumber = call.caller_phone;

  return (
    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-xl border border-red-500/20">
      {/* Pulsing red dot */}
      <div className="relative">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75" />
      </div>

      {/* Phone icon */}
      <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
        <Phone className="w-5 h-5 text-red-400" />
      </div>

      {/* Call info */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
            Live Call
          </span>
          <Wifi className="w-3 h-3 text-red-400 animate-pulse" />
        </div>
        <p className="text-white font-medium">
          {maskPhoneNumber(phoneNumber)}
        </p>
      </div>

      {/* Timer */}
      <div className="text-right">
        <p className="text-2xl font-mono font-bold text-white">
          {formatElapsedTime(elapsedSeconds)}
        </p>
        <p className="text-xs text-gray-400">duration</p>
      </div>
    </div>
  );
}

export function ActiveCallCard({ restaurantId }: ActiveCallCardProps) {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [isConnected, setIsConnected] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousCallCount = useRef(0);

  // Fetch active calls
  const fetchActiveCalls = useCallback(async () => {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select('id, vapi_call_id, caller_phone, started_at, status')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'active')
        .order('started_at', { ascending: false });

      if (error) {
        setLoadingState('error');
        return;
      }

      setActiveCalls((data as unknown as ActiveCall[]) || []);
      setLoadingState('loaded');
    } catch {
      setLoadingState('error');
    }
  }, [restaurantId]);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel;

    // Initial fetch
    fetchActiveCalls();

    // Subscribe to realtime changes
    channel = supabase
      .channel(`call_logs:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_logs',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCall = payload.new as ActiveCall;
            if (newCall.status === 'active') {
              setActiveCalls((prev) => [newCall, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedCall = payload.new as ActiveCall;
            if (updatedCall.status === 'active') {
              // Update existing active call
              setActiveCalls((prev) => {
                const exists = prev.some((c) => c.id === updatedCall.id);
                if (exists) {
                  return prev.map((c) => (c.id === updatedCall.id ? updatedCall : c));
                }
                return [updatedCall, ...prev];
              });
            } else {
              // Remove from active calls if status changed (with transition)
              setIsTransitioning(true);
              setTimeout(() => {
                setActiveCalls((prev) => prev.filter((c) => c.id !== updatedCall.id));
                setIsTransitioning(false);
              }, 300);
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setIsTransitioning(true);
            setTimeout(() => {
              setActiveCalls((prev) => prev.filter((c) => c.id !== deletedId));
              setIsTransitioning(false);
            }, 300);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [restaurantId, fetchActiveCalls]);

  // Track call count changes for animation
  useEffect(() => {
    previousCallCount.current = activeCalls.length;
  }, [activeCalls.length]);

  // Loading state
  if (loadingState === 'loading') {
    return (
      <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        <span className="text-sm text-gray-400">Checking for active calls...</span>
      </div>
    );
  }

  // Don't render if no active calls and not transitioning
  if (activeCalls.length === 0 && !isTransitioning) {
    return null;
  }

  return (
    <div
      className={cn(
        'space-y-4 transition-opacity duration-300',
        isTransitioning && activeCalls.length === 0 ? 'opacity-50' : 'opacity-100'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <div className="absolute inset-0 w-2 h-2 bg-red-500 rounded-full animate-ping" />
          </div>
          <h2 className="text-lg font-semibold text-white">Live Now</h2>
          <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">
            {activeCalls.length} active
          </span>
        </div>
        {isConnected && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            Connected
          </span>
        )}
      </div>

      {/* Active calls */}
      <div className="space-y-3">
        {activeCalls.map((call) => (
          <div
            key={call.id}
            className="transition-all duration-300 ease-in-out"
          >
            <ActiveCallItem call={call} />
          </div>
        ))}
      </div>
    </div>
  );
}
