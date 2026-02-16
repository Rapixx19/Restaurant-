'use client';

import { RESERVATION_STATUSES, STATUS_LABELS, type ReservationStatus } from '../types';

interface ReservationFiltersProps {
  selectedDate: string;
  selectedStatus: ReservationStatus | 'all';
  searchQuery: string;
  onDateChange: (date: string) => void;
  onStatusChange: (status: ReservationStatus | 'all') => void;
  onSearchChange: (search: string) => void;
}

export function ReservationFilters({
  selectedDate,
  selectedStatus,
  searchQuery,
  onDateChange,
  onStatusChange,
  onSearchChange,
}: ReservationFiltersProps) {
  const goToDate = (offset: number) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + offset);
    const year = current.getFullYear();
    const month = (current.getMonth() + 1).toString().padStart(2, '0');
    const day = current.getDate().toString().padStart(2, '0');
    onDateChange(`${year}-${month}-${day}`);
  };

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex items-center gap-2">
        <button
          onClick={() => goToDate(-1)}
          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
        >
          <svg
            className="w-5 h-5 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="relative">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-md text-white font-medium min-w-[140px] text-center cursor-pointer hover:bg-slate-700 transition-colors">
            {formatDateDisplay(selectedDate)}
          </div>
        </div>

        <button
          onClick={() => goToDate(1)}
          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
        >
          <svg
            className="w-5 h-5 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => {
            const today = new Date();
            const year = today.getFullYear();
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const day = today.getDate().toString().padStart(2, '0');
            onDateChange(`${year}-${month}-${day}`);
          }}
          className="px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-slate-300 transition-colors"
        >
          Today
        </button>
      </div>

      <div className="flex flex-1 gap-3 w-full sm:w-auto sm:max-w-lg">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value as ReservationStatus | 'all')}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          {RESERVATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
