'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { onboardingSchema } from '../schema';
import type { OnboardingFormState } from '../types';

/**
 * Generates a URL-friendly slug from a restaurant name.
 * Handles duplicates by appending a number.
 */
async function generateUniqueSlug(name: string, supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  // Convert to lowercase, replace spaces with hyphens, remove special chars
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  // Check if slug exists
  const { data: existing } = await supabase
    .from('restaurants')
    .select('slug')
    .like('slug', `${baseSlug}%`);

  if (!existing || existing.length === 0) {
    return baseSlug;
  }

  // Find the highest number suffix
  const slugPattern = new RegExp(`^${baseSlug}(-\\d+)?$`);
  const matchingSlugs = existing
    .map(r => r.slug)
    .filter(slug => slugPattern.test(slug));

  if (matchingSlugs.length === 0) {
    return baseSlug;
  }

  const numbers = matchingSlugs.map(slug => {
    const match = slug.match(/-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  });

  const maxNumber = Math.max(...numbers);
  return `${baseSlug}-${maxNumber + 1}`;
}

/**
 * Server action to create a new restaurant during onboarding.
 */
export async function createRestaurant(
  _prevState: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: 'You must be logged in to create a restaurant',
      success: false,
    };
  }

  // Parse form data
  const rawData = {
    name: formData.get('name') as string,
    street: formData.get('street') as string,
    city: formData.get('city') as string,
    state: formData.get('state') as string,
    zip: formData.get('zip') as string,
    country: formData.get('country') as string || 'United States',
    timezone: formData.get('timezone') as string,
    phone: formData.get('phone') as string,
    email: formData.get('email') as string,
  };

  // Validate with Zod
  const parsed = onboardingSchema.safeParse(rawData);

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

  // Generate unique slug
  const slug = await generateUniqueSlug(data.name, supabase);

  // Build address JSON
  const address = {
    street: data.street,
    city: data.city,
    state: data.state,
    zip: data.zip,
    country: data.country,
  };

  // Default settings for new restaurant
  const settings = {
    ai: {
      allowReservations: true,
      allowOrders: true,
      customInstructions: '',
    },
    capacity: {
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
    },
  };

  // Insert restaurant
  const { error: insertError } = await supabase
    .from('restaurants')
    .insert({
      owner_id: user.id,
      name: data.name,
      slug,
      phone: data.phone || null,
      email: data.email || null,
      address,
      timezone: data.timezone,
      settings,
    });

  if (insertError) {
    console.error('Restaurant creation error:', insertError);
    return {
      error: 'Failed to create restaurant. Please try again.',
      success: false,
    };
  }

  // Redirect to dashboard on success
  redirect('/dashboard');
}
