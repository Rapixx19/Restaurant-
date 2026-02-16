import type { Reservation } from '@/lib/database.types';

export type ReservationStatus = Reservation['status'];

export const RESERVATION_STATUSES: ReservationStatus[] = [
  'pending',
  'confirmed',
  'seated',
  'completed',
  'cancelled',
  'no_show',
];

export interface ReservationFilters {
  date: string;
  status: ReservationStatus | 'all';
  search: string;
}

export interface ReservationWithActions extends Reservation {
  canConfirm: boolean;
  canSeat: boolean;
  canComplete: boolean;
  canCancel: boolean;
  canMarkNoShow: boolean;
}

export type ReservationSource = 'phone' | 'chat' | 'website' | 'walk_in' | 'manual' | 'ai';

export const SOURCE_LABELS: Record<ReservationSource, string> = {
  phone: 'Phone',
  chat: 'Chat',
  website: 'Website',
  walk_in: 'Walk-in',
  manual: 'Manual',
  ai: 'AI Assistant',
};

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  seated: 'Seated',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export const STATUS_COLORS: Record<ReservationStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  seated: 'bg-green-500/20 text-green-400 border-green-500/30',
  completed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  no_show: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};
