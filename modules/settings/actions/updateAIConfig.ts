'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/database.types';
import type { SettingsFormState, RestaurantSettings } from '../types';

/**
 * Server action to update AI configuration.
 */
export async function updateAIConfig(
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

  // Parse form data
  const allowReservations = formData.get('allowReservations') === 'true';
  const allowOrders = formData.get('allowOrders') === 'true';
  const customInstructions = formData.get('customInstructions') as string || '';
  const greeting = formData.get('greeting') as string || 'Welcome! How can I help you today?';
  const personalityRaw = formData.get('personality') as string || 'friendly';

  // Validate instructions length
  if (customInstructions.length > 2000) {
    return {
      error: 'Custom instructions must be less than 2000 characters',
      success: false,
    };
  }

  // Validate greeting length
  if (greeting.length > 500) {
    return {
      error: 'Greeting must be less than 500 characters',
      success: false,
    };
  }

  // Validate personality
  const validPersonalities = ['friendly', 'formal', 'efficient'] as const;
  if (!validPersonalities.includes(personalityRaw as typeof validPersonalities[number])) {
    return {
      error: 'Invalid personality selection',
      success: false,
    };
  }
  const personality = personalityRaw as 'friendly' | 'formal' | 'efficient';

  // Merge with existing settings
  const currentSettings = (restaurant.settings || {}) as unknown as RestaurantSettings;
  const updatedSettings: RestaurantSettings = {
    ...currentSettings,
    ai: {
      allowReservations,
      allowOrders,
      customInstructions,
      greeting,
      personality,
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
      error: 'Failed to update AI configuration',
      success: false,
    };
  }

  revalidatePath('/dashboard/settings');

  return {
    error: null,
    success: true,
    message: 'AI configuration updated successfully',
  };
}
