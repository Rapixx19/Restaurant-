'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/database.types';
import type { SettingsFormState, RestaurantSettings, ELEVENLABS_VOICES } from '../types';

/**
 * Server action to update voice settings.
 */
export async function updateVoice(
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

  // Parse voice settings from form
  const enabled = formData.get('voiceEnabled') === 'true';
  const vapiAssistantId = (formData.get('vapiAssistantId') as string)?.trim() || undefined;
  const vapiPublicKey = (formData.get('vapiPublicKey') as string)?.trim() || undefined;
  const elevenLabsVoiceId = (formData.get('elevenLabsVoiceId') as string)?.trim() || undefined;
  const testPhoneNumber = (formData.get('testPhoneNumber') as string)?.trim() || undefined;
  const smsOnCompletion = formData.get('smsOnCompletion') === 'true';
  const primaryLanguage = (formData.get('primaryLanguage') as string)?.trim() || 'en';
  const autoLanguageDetection = formData.get('autoLanguageDetection') === 'true';
  const vapiPhoneNumberId = (formData.get('vapiPhoneNumberId') as string)?.trim() || undefined;

  // Validate phone number if provided
  if (testPhoneNumber) {
    const cleanPhone = testPhoneNumber.replace(/[\s\-()]/g, '');
    if (!/^\+?[1-9]\d{6,14}$/.test(cleanPhone)) {
      return {
        error: 'Invalid phone number format. Use E.164 format (e.g., +15551234567)',
        success: false,
      };
    }
  }

  // Merge with existing settings
  const currentSettings = (restaurant.settings || {}) as unknown as RestaurantSettings;
  const updatedSettings: RestaurantSettings = {
    ...currentSettings,
    voice: {
      enabled,
      vapiAssistantId,
      vapiPublicKey,
      elevenLabsVoiceId,
      testPhoneNumber,
      smsOnCompletion,
      primaryLanguage,
      autoLanguageDetection,
      vapiPhoneNumberId,
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
      error: 'Failed to update voice settings',
      success: false,
    };
  }

  revalidatePath('/dashboard/settings');

  return {
    error: null,
    success: true,
    message: 'Voice settings updated successfully',
  };
}

/**
 * Server action to trigger a test call via Vapi.
 */
export async function triggerTestCall(
  restaurantId: string
): Promise<{ success: boolean; error?: string; callId?: string }> {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'You must be logged in' };
  }

  // Verify ownership and get settings
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('owner_id, settings, name')
    .eq('id', restaurantId)
    .single();

  if (!restaurant || restaurant.owner_id !== user.id) {
    return { success: false, error: 'You do not have permission' };
  }

  const settings = (restaurant.settings || {}) as unknown as RestaurantSettings;
  const voiceSettings = settings.voice;

  if (!voiceSettings?.enabled) {
    return { success: false, error: 'Voice is not enabled for this restaurant' };
  }

  if (!voiceSettings.vapiAssistantId) {
    return { success: false, error: 'Vapi Assistant ID is required' };
  }

  if (!voiceSettings.testPhoneNumber) {
    return { success: false, error: 'Test phone number is required' };
  }

  // Call Vapi API to initiate outbound call
  const vapiApiKey = process.env.VAPI_API_KEY;
  if (!vapiApiKey) {
    return { success: false, error: 'Vapi API key not configured on server' };
  }

  try {
    const response = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + vapiApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: voiceSettings.vapiAssistantId,
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        customer: {
          number: voiceSettings.testPhoneNumber,
          name: 'Test Call',
        },
        assistantOverrides: {
          metadata: {
            restaurantId,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Vapi call error:', errorData);
      return { success: false, error: 'Failed to initiate call: ' + (errorData.message || 'Unknown error') };
    }

    const data = await response.json();
    return { success: true, callId: data.id };
  } catch (error) {
    console.error('Test call error:', error);
    return { success: false, error: 'Failed to connect to Vapi' };
  }
}
