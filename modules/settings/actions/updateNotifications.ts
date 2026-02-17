'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/database.types';
import type { SettingsFormState, RestaurantSettings } from '../types';

/**
 * Server action to update notification settings.
 */
export async function updateNotifications(
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

  // Parse notification settings
  const emailEnabled = formData.get('emailEnabled') === 'true';
  const smsEnabled = formData.get('smsEnabled') === 'true';
  const replyToEmail = (formData.get('replyToEmail') as string)?.trim() || undefined;

  // Validate reply-to email if provided
  if (replyToEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyToEmail)) {
    return {
      error: 'Invalid reply-to email address',
      success: false,
    };
  }

  // Merge with existing settings
  const currentSettings = (restaurant.settings || {}) as unknown as RestaurantSettings;
  const updatedSettings: RestaurantSettings = {
    ...currentSettings,
    notifications: {
      emailEnabled,
      smsEnabled,
      replyToEmail,
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
      error: 'Failed to update notification settings',
      success: false,
    };
  }

  revalidatePath('/dashboard/settings');

  return {
    error: null,
    success: true,
    message: 'Notification settings updated successfully',
  };
}
