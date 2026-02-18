'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { onboardingSchema } from '../schema';
import type { OnboardingFormState } from '../types';

/**
 * Ensures a profile exists for the user.
 * Creates one if missing (handles race condition with auth trigger).
 */
async function ensureProfileExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  email: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Check if profile exists
    const { data: existingProfile } = await (supabase as any)
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .limit(1);

    if (existingProfile && existingProfile.length > 0) {
      console.log('✅ Profile exists:', userId);
      return { success: true, error: null };
    }

    // Profile doesn't exist - create it
    console.log('⚠️ Profile missing, creating...');
    const { error: profileError } = await (supabase as any)
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      // Ignore duplicate key error (profile was created by trigger in parallel)
      if (profileError.code === '23505') {
        console.log('✅ Profile created by trigger (race condition resolved)');
        return { success: true, error: null };
      }
      console.error('❌ PROFILE_CREATE_ERROR:', profileError);
      return { success: false, error: profileError.message };
    }

    console.log('✅ Profile created:', userId);
    return { success: true, error: null };
  } catch (err) {
    console.error('❌ PROFILE_ERROR:', err);
    return { success: false, error: 'Failed to create profile' };
  }
}

/**
 * Gets or creates an organization for the user.
 * New users get the free plan by default.
 */
async function getOrCreateOrganization(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  restaurantName: string
): Promise<{ organizationId: string | null; error: string | null }> {
  try {
    // Check if user already has an organization
    const { data: existingOrg } = await (supabase as any)
      .from('organizations')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);

    if (existingOrg && existingOrg.length > 0) {
      console.log('✅ Found existing organization:', existingOrg[0].id);
      return { organizationId: existingOrg[0].id, error: null };
    }

    // Get free plan ID
    const { data: freePlan } = await (supabase as any)
      .from('plan_configs')
      .select('id')
      .eq('name', 'free')
      .limit(1);

    const planId = freePlan?.[0]?.id ?? null;

    // Create new organization
    const { data: newOrg, error: orgError } = await (supabase as any)
      .from('organizations')
      .insert({
        owner_id: userId,
        name: `${restaurantName} Organization`,
        plan_id: planId,
      })
      .select('id')
      .single();

    if (orgError) {
      console.error('❌ ORGANIZATION_CREATE_ERROR:', orgError);
      return { organizationId: null, error: orgError.message };
    }

    console.log('✅ Created new organization:', newOrg.id);

    // Add user as organization owner
    await (supabase as any)
      .from('organization_members')
      .insert({
        organization_id: newOrg.id,
        user_id: userId,
        role: 'owner',
        joined_at: new Date().toISOString(),
      });

    return { organizationId: newOrg.id, error: null };
  } catch (err) {
    console.error('❌ ORGANIZATION_ERROR:', err);
    return { organizationId: null, error: 'Failed to create organization' };
  }
}

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

  // Ensure profile exists (handles race condition with auth trigger)
  const userEmail = user.email ?? data.email ?? '';
  const { error: profileError } = await ensureProfileExists(
    supabase,
    user.id,
    userEmail
  );

  if (profileError) {
    return {
      error: `Profile error: ${profileError}`,
      success: false,
    };
  }

  // Generate unique slug
  const slug = await generateUniqueSlug(data.name, supabase);
  console.log('🔗 Generated slug:', slug);

  // Get or create organization for user
  const { organizationId, error: orgError } = await getOrCreateOrganization(
    supabase,
    user.id,
    data.name
  );

  if (orgError) {
    return {
      error: `Organization error: ${orgError}`,
      success: false,
    };
  }

  console.log('🏢 Organization ID:', organizationId);

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

  // Insert restaurant with organization_id
  const { data: newRestaurant, error: insertError } = await supabase
    .from('restaurants')
    .insert({
      owner_id: user.id,
      organization_id: organizationId,
      name: data.name,
      slug,
      phone: data.phone || null,
      email: data.email || null,
      address,
      timezone: data.timezone,
      settings,
    })
    .select('id, slug')
    .single();

  if (insertError) {
    console.error('❌ DATABASE_INSERT_ERROR:', {
      message: insertError.message,
      code: insertError.code,
      details: insertError.details,
      hint: insertError.hint,
    });
    return {
      error: `Failed to create restaurant: ${insertError.message}`,
      success: false,
    };
  }

  console.log('✅ Restaurant created:', newRestaurant);

  // Redirect to dashboard on success
  redirect('/dashboard');
}
