import { createClient as createAnonClient } from '@supabase/supabase-js';
import type { RestaurantSettings, OperatingHours, DayOfWeek } from '@/modules/settings/types';

interface AvailabilityResult {
  available: boolean;
  reason?: string;
  suggestedTimes?: string[];
}

interface BookingResult {
  success: boolean;
  reservationId?: string;
  error?: string;
}

interface ReservationInput {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  partySize: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  specialRequests?: string;
  source?: 'phone' | 'chat' | 'website' | 'walk_in' | 'manual' | 'ai';
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

/**
 * Get the day of week for a given date string.
 */
function getDayOfWeek(dateStr: string): DayOfWeek {
  const date = new Date(dateStr + 'T12:00:00'); // Use noon to avoid timezone issues
  return DAYS_OF_WEEK[date.getDay()];
}

/**
 * Convert time string (HH:mm) to minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if a requested time falls within operating hours.
 */
export function checkOperatingHours(
  operatingHours: OperatingHours | undefined,
  date: string,
  time: string
): { isOpen: boolean; reason?: string; hours?: { open: string; close: string } } {
  if (!operatingHours) {
    return { isOpen: true }; // No hours set means always available
  }

  const dayOfWeek = getDayOfWeek(date);
  const dayHours = operatingHours[dayOfWeek];

  if (!dayHours) {
    return { isOpen: true }; // No hours for this day means open
  }

  if (dayHours.closed) {
    return {
      isOpen: false,
      reason: `The restaurant is closed on ${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}s.`,
    };
  }

  const requestedMinutes = timeToMinutes(time);
  const openMinutes = timeToMinutes(dayHours.open);
  const closeMinutes = timeToMinutes(dayHours.close);

  // Ensure reservation is at least 1 hour before closing
  const lastReservationMinutes = closeMinutes - 60;

  if (requestedMinutes < openMinutes) {
    return {
      isOpen: false,
      reason: `The restaurant doesn't open until ${dayHours.open} on ${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}s.`,
      hours: { open: dayHours.open, close: dayHours.close },
    };
  }

  if (requestedMinutes > lastReservationMinutes) {
    return {
      isOpen: false,
      reason: `The last reservation is at ${formatTime(lastReservationMinutes)} (1 hour before closing at ${dayHours.close}).`,
      hours: { open: dayHours.open, close: dayHours.close },
    };
  }

  return { isOpen: true, hours: { open: dayHours.open, close: dayHours.close } };
}

/**
 * Format minutes since midnight to HH:mm string.
 */
function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Check capacity for a given date/time slot.
 */
export async function checkCapacity(
  restaurantId: string,
  date: string,
  time: string,
  partySize: number,
  settings: RestaurantSettings
): Promise<{ hasCapacity: boolean; reason?: string; currentGuests?: number; maxCapacity?: number }> {
  const supabase = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const capacity = settings.capacity;
  const maxTables = capacity?.maxTables || 20;
  const seatsPerTable = capacity?.seatsPerTable || 4;
  const maxCapacity = maxTables * seatsPerTable;
  const defaultDuration = capacity?.defaultReservationDuration || 90;

  // Get existing reservations that overlap with requested time
  // A reservation overlaps if it starts within defaultDuration minutes of the requested time
  const requestedMinutes = timeToMinutes(time);
  const windowStart = Math.max(0, requestedMinutes - defaultDuration);
  const windowEnd = requestedMinutes + defaultDuration;

  // Query reservations for this date
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('party_size, reservation_time, duration_minutes')
    .eq('restaurant_id', restaurantId)
    .eq('reservation_date', date)
    .in('status', ['pending', 'confirmed', 'seated']);

  if (error) {
    console.error('Error checking capacity:', error);
    return { hasCapacity: true }; // Allow on error to not block bookings
  }

  // Calculate total guests during the requested time window
  let currentGuests = 0;
  for (const res of reservations || []) {
    const resMinutes = timeToMinutes(res.reservation_time);
    const resDuration = res.duration_minutes || defaultDuration;
    const resEnd = resMinutes + resDuration;

    // Check if this reservation overlaps with our requested window
    if (resMinutes < windowEnd && resEnd > requestedMinutes) {
      currentGuests += res.party_size;
    }
  }

  // Check if adding this party would exceed capacity
  if (currentGuests + partySize > maxCapacity) {
    return {
      hasCapacity: false,
      reason: `We're fully booked at ${time}. We can accommodate ${maxCapacity - currentGuests} more guests at this time.`,
      currentGuests,
      maxCapacity,
    };
  }

  return { hasCapacity: true, currentGuests, maxCapacity };
}

/**
 * Find suggested available times near the requested time.
 */
async function findSuggestedTimes(
  restaurantId: string,
  date: string,
  requestedTime: string,
  partySize: number,
  settings: RestaurantSettings
): Promise<string[]> {
  const operatingHours = settings.capacity?.operatingHours;
  const dayOfWeek = getDayOfWeek(date);
  const dayHours = operatingHours?.[dayOfWeek];

  if (!dayHours || dayHours.closed) {
    return [];
  }

  const suggestions: string[] = [];
  const requestedMinutes = timeToMinutes(requestedTime);
  const openMinutes = timeToMinutes(dayHours.open);
  const closeMinutes = timeToMinutes(dayHours.close) - 60; // 1 hour before closing

  // Check times in 30-minute increments, starting from nearest to requested
  const timeSlots: number[] = [];
  for (let delta = 30; delta <= 120; delta += 30) {
    const earlier = requestedMinutes - delta;
    const later = requestedMinutes + delta;

    if (earlier >= openMinutes) timeSlots.push(earlier);
    if (later <= closeMinutes) timeSlots.push(later);
  }

  for (const slot of timeSlots) {
    const slotTime = formatTime(slot);
    const capacityCheck = await checkCapacity(restaurantId, date, slotTime, partySize, settings);
    if (capacityCheck.hasCapacity) {
      suggestions.push(slotTime);
      if (suggestions.length >= 3) break;
    }
  }

  return suggestions;
}

/**
 * Main availability check function.
 * Validates both operating hours and capacity.
 */
export async function checkAvailability(
  restaurantId: string,
  date: string,
  time: string,
  partySize: number
): Promise<AvailabilityResult> {
  const supabase = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Validate date is not in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const requestedDate = new Date(date + 'T00:00:00');

  if (requestedDate < today) {
    return {
      available: false,
      reason: 'Cannot book reservations for past dates.',
    };
  }

  // Validate party size
  if (partySize < 1 || partySize > 50) {
    return {
      available: false,
      reason: 'Party size must be between 1 and 50 guests.',
    };
  }

  // Fetch restaurant settings
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('settings')
    .eq('id', restaurantId)
    .single();

  if (restaurantError || !restaurant) {
    return {
      available: false,
      reason: 'Restaurant not found.',
    };
  }

  const settings = (restaurant.settings || {}) as RestaurantSettings;

  // Check operating hours
  const hoursCheck = checkOperatingHours(settings.capacity?.operatingHours, date, time);
  if (!hoursCheck.isOpen) {
    return {
      available: false,
      reason: hoursCheck.reason,
    };
  }

  // Check capacity
  const capacityCheck = await checkCapacity(restaurantId, date, time, partySize, settings);
  if (!capacityCheck.hasCapacity) {
    const suggestions = await findSuggestedTimes(restaurantId, date, time, partySize, settings);
    return {
      available: false,
      reason: capacityCheck.reason,
      suggestedTimes: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  return { available: true };
}

/**
 * Book a reservation after availability is confirmed.
 */
export async function bookReservation(input: ReservationInput): Promise<BookingResult> {
  const supabase = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Double-check availability before booking
  const availability = await checkAvailability(
    input.restaurantId,
    input.date,
    input.time,
    input.partySize
  );

  if (!availability.available) {
    return {
      success: false,
      error: availability.reason || 'Time slot no longer available.',
    };
  }

  // Fetch default duration from settings
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('settings')
    .eq('id', input.restaurantId)
    .single();

  const settings = (restaurant?.settings || {}) as RestaurantSettings;
  const durationMinutes = settings.capacity?.defaultReservationDuration || 90;

  // Create the reservation
  const { data: reservation, error } = await supabase
    .from('reservations')
    .insert({
      restaurant_id: input.restaurantId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_email: input.customerEmail || null,
      party_size: input.partySize,
      reservation_date: input.date,
      reservation_time: input.time,
      duration_minutes: durationMinutes,
      status: 'confirmed',
      source: input.source || 'ai',
      special_requests: input.specialRequests || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating reservation:', error);
    return {
      success: false,
      error: 'Failed to create reservation. Please try again.',
    };
  }

  return {
    success: true,
    reservationId: reservation.id,
  };
}

/**
 * Format a reservation confirmation message.
 */
export function formatConfirmation(
  customerName: string,
  date: string,
  time: string,
  partySize: number
): string {
  const dateObj = new Date(date + 'T12:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Convert 24h to 12h format
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  const formattedTime = `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;

  return `Your reservation is confirmed:
- Name: ${customerName}
- Date: ${formattedDate}
- Time: ${formattedTime}
- Party size: ${partySize} ${partySize === 1 ? 'guest' : 'guests'}

We look forward to seeing you!`;
}
