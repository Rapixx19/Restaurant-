'use client';

import { useState, useTransition } from 'react';
import type { Reservation } from '@/lib/database.types';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  SOURCE_LABELS,
  type ReservationStatus,
  type ReservationSource,
} from '../types';

interface ReservationCardProps {
  reservation: Reservation;
  onStatusChange: (id: string, status: ReservationStatus) => Promise<void>;
}

export function ReservationCard({ reservation, onStatusChange }: ReservationCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showActions, setShowActions] = useState(false);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleStatusChange = (newStatus: ReservationStatus) => {
    startTransition(async () => {
      await onStatusChange(reservation.id, newStatus);
      setShowActions(false);
    });
  };

  const getAvailableActions = (): { status: ReservationStatus; label: string; color: string }[] => {
    const actions: { status: ReservationStatus; label: string; color: string }[] = [];

    switch (reservation.status) {
      case 'pending':
        actions.push(
          { status: 'confirmed', label: 'Confirm', color: 'bg-blue-600 hover:bg-blue-700' },
          { status: 'cancelled', label: 'Cancel', color: 'bg-red-600 hover:bg-red-700' }
        );
        break;
      case 'confirmed':
        actions.push(
          { status: 'seated', label: 'Seat', color: 'bg-green-600 hover:bg-green-700' },
          { status: 'cancelled', label: 'Cancel', color: 'bg-red-600 hover:bg-red-700' },
          { status: 'no_show', label: 'No Show', color: 'bg-orange-600 hover:bg-orange-700' }
        );
        break;
      case 'seated':
        actions.push(
          { status: 'completed', label: 'Complete', color: 'bg-gray-600 hover:bg-gray-700' }
        );
        break;
      default:
        break;
    }

    return actions;
  };

  const availableActions = getAvailableActions();

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-white truncate">{reservation.customer_name}</h3>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full border ${STATUS_COLORS[reservation.status]}`}
            >
              {STATUS_LABELS[reservation.status]}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm">
            <div>
              <span className="text-slate-400">Time:</span>
              <span className="ml-1 text-white">{formatTime(reservation.time)}</span>
            </div>
            <div>
              <span className="text-slate-400">Party:</span>
              <span className="ml-1 text-white">{reservation.party_size} guests</span>
            </div>
            <div>
              <span className="text-slate-400">Phone:</span>
              <span className="ml-1 text-white">{reservation.customer_phone}</span>
            </div>
            <div>
              <span className="text-slate-400">Source:</span>
              <span className="ml-1 text-white">
                {SOURCE_LABELS[reservation.source as ReservationSource] || reservation.source}
              </span>
            </div>
          </div>

          {reservation.special_requests && (
            <div className="mt-2 text-sm">
              <span className="text-slate-400">Notes:</span>
              <span className="ml-1 text-slate-300">{reservation.special_requests}</span>
            </div>
          )}

          {reservation.table_assignment && (
            <div className="mt-1 text-sm">
              <span className="text-slate-400">Table:</span>
              <span className="ml-1 text-white font-medium">{reservation.table_assignment}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {availableActions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                disabled={isPending}
                className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <span className="flex items-center gap-1">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Updating...
                  </span>
                ) : (
                  'Actions'
                )}
              </button>

              {showActions && !isPending && (
                <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-10 min-w-[120px]">
                  {availableActions.map((action) => (
                    <button
                      key={action.status}
                      onClick={() => handleStatusChange(action.status)}
                      className={`w-full px-3 py-2 text-sm text-left text-white hover:bg-slate-700 first:rounded-t-md last:rounded-b-md transition-colors`}
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
    </div>
  );
}
