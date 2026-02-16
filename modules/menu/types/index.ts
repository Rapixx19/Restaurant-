import type { MenuCategory, MenuItem } from '@/lib/database.types';

/**
 * Types for the menu module.
 */

export type { MenuCategory, MenuItem };

export interface MenuFormState {
  error: string | null;
  fieldErrors?: Record<string, string[]>;
  success: boolean;
  message?: string;
}

export interface CategoryFormData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface MenuItemFormData {
  name: string;
  description?: string;
  price: number;
  category_id?: string | null;
  image_url?: string | null;
  allergens?: string[];
  dietary_tags?: string[];
  is_available?: boolean;
  is_featured?: boolean;
}

export interface MenuItemWithCategory extends MenuItem {
  category?: MenuCategory | null;
}

export interface DietaryTag {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export interface TierLimits {
  menuItems: number | 'unlimited';
}
