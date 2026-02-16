'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getPricingTier } from '@/modules/landing/constants/pricing';
import type { MenuFormState } from '../types';
import type { RestaurantSettings, TierId } from '@/modules/settings/types';
import type { Json } from '@/lib/database.types';

/**
 * Check if the restaurant has reached its menu item limit based on tier.
 */
async function checkTierLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  restaurantId: string,
  settings: RestaurantSettings | null
): Promise<{ allowed: boolean; message?: string }> {
  const tierId: TierId = settings?.tier || 'free';
  const tier = getPricingTier(tierId);

  if (!tier) {
    return { allowed: true };
  }

  const limit = tier.limits.menuItems;
  if (limit === 'unlimited') {
    return { allowed: true };
  }

  const { count } = await supabase
    .from('menu_items')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId);

  const currentCount = count || 0;

  if (currentCount >= limit) {
    if (tierId === 'free') {
      return {
        allowed: false,
        message: `Free plan is limited to ${limit} menu items. Upgrade to Starter for more.`,
      };
    }
    if (tierId === 'starter') {
      return {
        allowed: false,
        message: `Starter plan is limited to ${limit} menu items. Upgrade to Professional for unlimited items.`,
      };
    }
    return {
      allowed: false,
      message: `You have reached your plan's limit of ${limit} menu items.`,
    };
  }

  return { allowed: true };
}

/**
 * Create a new menu item with tier enforcement.
 */
export async function createMenuItem(
  restaurantId: string,
  _prevState: MenuFormState,
  formData: FormData
): Promise<MenuFormState> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'You must be logged in', success: false };
    }

    // Verify ownership and get settings
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('owner_id, settings')
      .eq('id', restaurantId)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return { error: 'You do not have permission to modify this restaurant', success: false };
    }

    // Check tier limit
    const settings = (restaurant.settings || {}) as unknown as RestaurantSettings;
    const tierCheck = await checkTierLimit(supabase, restaurantId, settings);
    if (!tierCheck.allowed) {
      return { error: tierCheck.message || 'Menu item limit reached', success: false };
    }

    // Parse form data
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || null;
    const priceStr = formData.get('price') as string;
    const categoryId = formData.get('category_id') as string || null;
    const isAvailable = formData.get('is_available') === 'true';
    const isFeatured = formData.get('is_featured') === 'true';
    const dietaryTagsStr = formData.get('dietary_tags') as string || '';
    const allergensStr = formData.get('allergens') as string || '';
    const imageUrl = formData.get('image_url') as string || null;

    // Validation
    if (!name || name.trim().length < 2) {
      return { error: 'Item name must be at least 2 characters', success: false };
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
      return { error: 'Price must be a valid positive number', success: false };
    }

    // Parse arrays
    const dietaryTags = dietaryTagsStr ? dietaryTagsStr.split(',').filter(Boolean) : [];
    const allergens = allergensStr ? allergensStr.split(',').filter(Boolean) : [];

    // Get highest sort order in category
    const { data: lastItem } = await supabase
      .from('menu_items')
      .select('sort_order')
      .eq('restaurant_id', restaurantId)
      .eq('category_id', categoryId || '')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (lastItem?.sort_order ?? -1) + 1;

    const { error: insertError } = await supabase
      .from('menu_items')
      .insert({
        restaurant_id: restaurantId,
        category_id: categoryId || null,
        name: name.trim(),
        description,
        price,
        image_url: imageUrl,
        allergens,
        dietary_tags: dietaryTags,
        is_available: isAvailable,
        is_featured: isFeatured,
        sort_order: sortOrder,
        metadata: {} as Json,
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return { error: 'Failed to create menu item', success: false };
    }

    revalidatePath('/dashboard/menu');
    return { error: null, success: true, message: 'Menu item created successfully' };
  } catch (error) {
    console.error('Create menu item error:', error);
    return { error: 'An unexpected error occurred', success: false };
  }
}

/**
 * Update an existing menu item.
 */
export async function updateMenuItem(
  itemId: string,
  _prevState: MenuFormState,
  formData: FormData
): Promise<MenuFormState> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'You must be logged in', success: false };
    }

    // Get item and verify ownership
    const { data: item } = await supabase
      .from('menu_items')
      .select('restaurant_id')
      .eq('id', itemId)
      .single();

    if (!item) {
      return { error: 'Menu item not found', success: false };
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('owner_id')
      .eq('id', item.restaurant_id)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return { error: 'You do not have permission to modify this item', success: false };
    }

    // Parse form data
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || null;
    const priceStr = formData.get('price') as string;
    const categoryId = formData.get('category_id') as string || null;
    const isAvailable = formData.get('is_available') === 'true';
    const isFeatured = formData.get('is_featured') === 'true';
    const dietaryTagsStr = formData.get('dietary_tags') as string || '';
    const allergensStr = formData.get('allergens') as string || '';
    const imageUrl = formData.get('image_url') as string || null;

    // Validation
    if (!name || name.trim().length < 2) {
      return { error: 'Item name must be at least 2 characters', success: false };
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
      return { error: 'Price must be a valid positive number', success: false };
    }

    const dietaryTags = dietaryTagsStr ? dietaryTagsStr.split(',').filter(Boolean) : [];
    const allergens = allergensStr ? allergensStr.split(',').filter(Boolean) : [];

    const { error: updateError } = await supabase
      .from('menu_items')
      .update({
        name: name.trim(),
        description,
        price,
        category_id: categoryId || null,
        image_url: imageUrl,
        allergens,
        dietary_tags: dietaryTags,
        is_available: isAvailable,
        is_featured: isFeatured,
      })
      .eq('id', itemId);

    if (updateError) {
      console.error('Update error:', updateError);
      return { error: 'Failed to update menu item', success: false };
    }

    revalidatePath('/dashboard/menu');
    return { error: null, success: true, message: 'Menu item updated successfully' };
  } catch (error) {
    console.error('Update menu item error:', error);
    return { error: 'An unexpected error occurred', success: false };
  }
}

/**
 * Delete a menu item.
 */
export async function deleteMenuItem(itemId: string): Promise<MenuFormState> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'You must be logged in', success: false };
    }

    // Get item and verify ownership
    const { data: item } = await supabase
      .from('menu_items')
      .select('restaurant_id, image_url')
      .eq('id', itemId)
      .single();

    if (!item) {
      return { error: 'Menu item not found', success: false };
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('owner_id')
      .eq('id', item.restaurant_id)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return { error: 'You do not have permission to delete this item', success: false };
    }

    // Delete the image from storage if it exists
    if (item.image_url) {
      const path = item.image_url.split('/').slice(-3).join('/');
      await supabase.storage.from('restaurant-assets').remove([path]);
    }

    const { error: deleteError } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return { error: 'Failed to delete menu item', success: false };
    }

    revalidatePath('/dashboard/menu');
    return { error: null, success: true, message: 'Menu item deleted successfully' };
  } catch (error) {
    console.error('Delete menu item error:', error);
    return { error: 'An unexpected error occurred', success: false };
  }
}

/**
 * Toggle menu item availability (optimistic update friendly).
 */
export async function toggleItemAvailability(
  itemId: string,
  isAvailable: boolean
): Promise<MenuFormState> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'You must be logged in', success: false };
    }

    // Get item and verify ownership
    const { data: item } = await supabase
      .from('menu_items')
      .select('restaurant_id')
      .eq('id', itemId)
      .single();

    if (!item) {
      return { error: 'Menu item not found', success: false };
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('owner_id')
      .eq('id', item.restaurant_id)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return { error: 'You do not have permission to modify this item', success: false };
    }

    const { error: updateError } = await supabase
      .from('menu_items')
      .update({ is_available: isAvailable })
      .eq('id', itemId);

    if (updateError) {
      console.error('Toggle error:', updateError);
      return { error: 'Failed to update availability', success: false };
    }

    revalidatePath('/dashboard/menu');
    return { error: null, success: true };
  } catch (error) {
    console.error('Toggle availability error:', error);
    return { error: 'An unexpected error occurred', success: false };
  }
}

/**
 * Upload menu item image.
 */
export async function uploadMenuImage(
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) {
      return { url: null, error: 'Unauthorized' };
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return { url: null, error: 'Invalid file type. Use JPEG, PNG, WebP, or GIF.' };
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { url: null, error: 'File too large. Maximum size is 5MB.' };
    }

    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const path = `${userId}/menu/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('restaurant-assets')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { url: null, error: 'Failed to upload image' };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('restaurant-assets')
      .getPublicUrl(path);

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('Upload error:', error);
    return { url: null, error: 'An unexpected error occurred' };
  }
}
