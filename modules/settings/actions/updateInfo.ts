'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { infoSchema } from '../schema';
import type { SettingsFormState } from '../types';

/**
 * Server action to update restaurant info.
 */
export async function updateInfo(
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

  // Verify ownership
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('owner_id')
    .eq('id', restaurantId)
    .single();

  if (!restaurant || restaurant.owner_id !== user.id) {
    return {
      error: 'You do not have permission to update this restaurant',
      success: false,
    };
  }

  // Parse form data
  const rawData = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    phone: formData.get('phone') as string,
    email: formData.get('email') as string,
    website: formData.get('website') as string,
    street: formData.get('street') as string,
    city: formData.get('city') as string,
    state: formData.get('state') as string,
    zip: formData.get('zip') as string,
    country: formData.get('country') as string,
  };

  // Validate
  const parsed = infoSchema.safeParse(rawData);

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    parsed.error.errors.forEach((err) => {
      const field = err.path[0] as string;
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(err.message);
    });

    return {
      error: 'Please fix the errors below',
      fieldErrors,
      success: false,
    };
  }

  const data = parsed.data;

  // Build address JSON
  const address = {
    street: data.street,
    city: data.city,
    state: data.state,
    zip: data.zip,
    country: data.country,
  };

  // Update restaurant
  const { error: updateError } = await supabase
    .from('restaurants')
    .update({
      name: data.name,
      description: data.description || null,
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      address,
    })
    .eq('id', restaurantId);

  if (updateError) {
    console.error('Update error:', updateError);
    return {
      error: 'Failed to update restaurant info',
      success: false,
    };
  }

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');

  return {
    error: null,
    success: true,
    message: 'Restaurant info updated successfully',
  };
}
