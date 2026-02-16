'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { MenuFormState } from '../types';

/**
 * Create a new menu category.
 */
export async function createCategory(
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

    // Verify ownership
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('owner_id')
      .eq('id', restaurantId)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return { error: 'You do not have permission to modify this restaurant', success: false };
    }

    const name = formData.get('name') as string;
    const description = formData.get('description') as string || null;

    if (!name || name.trim().length < 2) {
      return { error: 'Category name must be at least 2 characters', success: false };
    }

    // Get the highest sort order
    const { data: lastCategory } = await supabase
      .from('menu_categories')
      .select('sort_order')
      .eq('restaurant_id', restaurantId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (lastCategory?.sort_order ?? -1) + 1;

    const { error: insertError } = await supabase
      .from('menu_categories')
      .insert({
        restaurant_id: restaurantId,
        name: name.trim(),
        description,
        sort_order: sortOrder,
        is_active: true,
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return { error: 'Failed to create category', success: false };
    }

    revalidatePath('/dashboard/menu');
    return { error: null, success: true, message: 'Category created successfully' };
  } catch (error) {
    console.error('Create category error:', error);
    return { error: 'An unexpected error occurred', success: false };
  }
}

/**
 * Update an existing menu category.
 */
export async function updateCategory(
  categoryId: string,
  _prevState: MenuFormState,
  formData: FormData
): Promise<MenuFormState> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'You must be logged in', success: false };
    }

    // Get category and verify ownership through restaurant
    const { data: category } = await supabase
      .from('menu_categories')
      .select('restaurant_id')
      .eq('id', categoryId)
      .single();

    if (!category) {
      return { error: 'Category not found', success: false };
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('owner_id')
      .eq('id', category.restaurant_id)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return { error: 'You do not have permission to modify this category', success: false };
    }

    const name = formData.get('name') as string;
    const description = formData.get('description') as string || null;
    const isActive = formData.get('is_active') === 'true';

    if (!name || name.trim().length < 2) {
      return { error: 'Category name must be at least 2 characters', success: false };
    }

    const { error: updateError } = await supabase
      .from('menu_categories')
      .update({
        name: name.trim(),
        description,
        is_active: isActive,
      })
      .eq('id', categoryId);

    if (updateError) {
      console.error('Update error:', updateError);
      return { error: 'Failed to update category', success: false };
    }

    revalidatePath('/dashboard/menu');
    return { error: null, success: true, message: 'Category updated successfully' };
  } catch (error) {
    console.error('Update category error:', error);
    return { error: 'An unexpected error occurred', success: false };
  }
}

/**
 * Delete a menu category.
 */
export async function deleteCategory(categoryId: string): Promise<MenuFormState> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'You must be logged in', success: false };
    }

    // Get category and verify ownership
    const { data: category } = await supabase
      .from('menu_categories')
      .select('restaurant_id')
      .eq('id', categoryId)
      .single();

    if (!category) {
      return { error: 'Category not found', success: false };
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('owner_id')
      .eq('id', category.restaurant_id)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return { error: 'You do not have permission to delete this category', success: false };
    }

    // Check if category has items
    const { count } = await supabase
      .from('menu_items')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    if (count && count > 0) {
      return { error: 'Cannot delete category with menu items. Move or delete items first.', success: false };
    }

    const { error: deleteError } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', categoryId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return { error: 'Failed to delete category', success: false };
    }

    revalidatePath('/dashboard/menu');
    return { error: null, success: true, message: 'Category deleted successfully' };
  } catch (error) {
    console.error('Delete category error:', error);
    return { error: 'An unexpected error occurred', success: false };
  }
}

/**
 * Reorder categories by updating sort_order.
 */
export async function reorderCategories(
  restaurantId: string,
  categoryIds: string[]
): Promise<MenuFormState> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'You must be logged in', success: false };
    }

    // Verify ownership
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('owner_id')
      .eq('id', restaurantId)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return { error: 'You do not have permission to modify this restaurant', success: false };
    }

    // Update sort_order for each category
    const updates = categoryIds.map((id, index) =>
      supabase
        .from('menu_categories')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
    );

    await Promise.all(updates);

    revalidatePath('/dashboard/menu');
    return { error: null, success: true, message: 'Categories reordered successfully' };
  } catch (error) {
    console.error('Reorder categories error:', error);
    return { error: 'An unexpected error occurred', success: false };
  }
}
