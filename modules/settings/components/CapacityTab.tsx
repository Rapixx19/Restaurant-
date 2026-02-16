'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { AlertCircle, Check, Loader2, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateCapacity } from '../actions/updateCapacity';
import type { SettingsFormState, RestaurantSettings, DayOfWeek } from '../types';
import { DAYS_OF_WEEK } from '../types';
import type { Restaurant } from '@/lib/supabase/types';

const initialState: SettingsFormState = {
  error: null,
  success: false,
};

interface CapacityTabProps {
  restaurant: Restaurant;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        'flex items-center justify-center gap-2',
        'px-6 py-2.5 rounded-lg',
        'bg-electric-blue hover:bg-electric-blue-600',
        'text-white font-medium',
        'transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving...
        </>
      ) : (
        'Save Changes'
      )}
    </button>
  );
}

interface DayRowProps {
  day: DayOfWeek;
  defaultOpen: string;
  defaultClose: string;
  defaultClosed: boolean;
}

function DayRow({ day, defaultOpen, defaultClose, defaultClosed }: DayRowProps) {
  const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);

  return (
    <div className="flex items-center gap-4">
      <div className="w-24 text-sm font-medium text-gray-300">{dayLabel}</div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          name={`${day}_closed`}
          value="true"
          defaultChecked={defaultClosed}
          className="sr-only peer"
        />
        <div className={cn(
          'w-9 h-5 rounded-full transition-colors',
          'bg-white/10 peer-checked:bg-red-500/50'
        )}>
          <div className={cn(
            'w-4 h-4 mt-0.5 ml-0.5 rounded-full bg-white transition-transform',
            'peer-checked:translate-x-4'
          )} />
        </div>
        <span className="text-xs text-gray-500 w-12">Closed</span>
      </label>

      <div className="flex items-center gap-2 flex-1">
        <input
          type="time"
          name={`${day}_open`}
          defaultValue={defaultOpen}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm',
            'bg-white/5 border border-white/10',
            'text-white',
            'focus:outline-none focus:ring-2 focus:ring-electric-blue'
          )}
        />
        <span className="text-gray-500">to</span>
        <input
          type="time"
          name={`${day}_close`}
          defaultValue={defaultClose}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm',
            'bg-white/5 border border-white/10',
            'text-white',
            'focus:outline-none focus:ring-2 focus:ring-electric-blue'
          )}
        />
      </div>
    </div>
  );
}

export function CapacityTab({ restaurant }: CapacityTabProps) {
  const updateCapacityWithId = updateCapacity.bind(null, restaurant.id);
  const [state, formAction] = useFormState(updateCapacityWithId, initialState);

  const settings = (restaurant.settings || {}) as unknown as RestaurantSettings;
  const capacitySettings = settings.capacity || {
    maxPartySize: 12,
    operatingHours: {
      monday: { open: '11:00', close: '22:00', closed: false },
      tuesday: { open: '11:00', close: '22:00', closed: false },
      wednesday: { open: '11:00', close: '22:00', closed: false },
      thursday: { open: '11:00', close: '22:00', closed: false },
      friday: { open: '11:00', close: '23:00', closed: false },
      saturday: { open: '11:00', close: '23:00', closed: false },
      sunday: { open: '11:00', close: '21:00', closed: false },
    },
  };

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{state.error}</p>
        </div>
      )}

      {state.success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
          <Check className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{state.message}</p>
        </div>
      )}

      {/* Max Party Size */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Maximum Party Size</h3>
            <p className="text-sm text-gray-400">Largest group the AI can accept for reservations</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <input
              type="number"
              name="maxPartySize"
              defaultValue={capacitySettings.maxPartySize}
              min={1}
              max={100}
              className={cn(
                'w-24 px-4 py-2.5 rounded-lg text-center',
                'bg-white/5 border border-white/10',
                'text-white text-lg font-semibold',
                'focus:outline-none focus:ring-2 focus:ring-electric-blue'
              )}
            />
            <span className="text-gray-400">guests maximum</span>
          </div>
        </div>
      </div>

      {/* Operating Hours */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Operating Hours</h3>
            <p className="text-sm text-gray-400">When is your restaurant open for business?</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-6 space-y-4">
          {DAYS_OF_WEEK.map((day) => (
            <DayRow
              key={day}
              day={day}
              defaultOpen={capacitySettings.operatingHours[day]?.open || '11:00'}
              defaultClose={capacitySettings.operatingHours[day]?.close || '22:00'}
              defaultClosed={capacitySettings.operatingHours[day]?.closed || false}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-white/10">
        <SubmitButton />
      </div>
    </form>
  );
}
