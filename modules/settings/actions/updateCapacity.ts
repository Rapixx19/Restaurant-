'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/database.types';
import type { SettingsFormState, RestaurantSettings, OperatingHours, DayOfWeek } from '../types';
import { DAYS_OF_WEEK } from '../types';

/**
 * Server action to update capacity and operating hours.
 */
export async function updateCapacity(
  restaurantId: string,
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: 'You must be logged in',
      success: false,
    };
  }

  // Verify ownership and get current settings
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('owner_id, settings')
    .eq('id', restaurantId)
    .single();

  if (!restaurant || restaurant.owner_id !== user.id) {
    return {
      error: 'You do not have permission to update this restaurant',
      success: false,
    };
  }

  // Parse max party size
  const maxPartySizeStr = formData.get('maxPartySize') as string;
  const maxPartySize = parseInt(maxPartySizeStr, 10);

  if (isNaN(maxPartySize) || maxPartySize < 1 || maxPartySize > 100) {
    return {
      error: 'Max party size must be between 1 and 100',
      success: false,
    };
  }

  // Parse operating hours
  const operatingHours: OperatingHours = {} as OperatingHours;

  for (const day of DAYS_OF_WEEK) {
    const open = formData.get(`${day}_open`) as string || '09:00';
    const close = formData.get(`${day}_close`) as string || '22:00';
    const closed = formData.get(`${day}_closed`) === 'true';

    operatingHours[day as DayOfWeek] = {
      open,
      close,
      closed,
    };
  }

  // Merge with existing settings
  const currentSettings = (restaurant.settings || {}) as unknown as RestaurantSettings;
  const updatedSettings: RestaurantSettings = {
    ...currentSettings,
    capacity: {
      maxPartySize,
      maxTables: currentSettings.capacity?.maxTables || 20,
      seatsPerTable: currentSettings.capacity?.seatsPerTable || 4,
      defaultReservationDuration: currentSettings.capacity?.defaultReservationDuration || 90,
      operatingHours,
    },
  };

  // Update restaurant
  const { error: updateError } = await supabase
    .from('restaurants')
    .update({
      settings: updatedSettings as unknown as Json,
    })
    .eq('id', restaurantId);

  if (updateError) {
    console.error('Update error:', updateError);
    return {
      error: 'Failed to update capacity settings',
      success: false,
    };
  }

  revalidatePath('/dashboard/settings');

  return {
    error: null,
    success: true,
    message: 'Capacity settings updated successfully',
  };
}
