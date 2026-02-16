import type { DietaryTag } from '../types';

/**
 * SSOT for dietary tags used across the menu system.
 * These tags help customers identify suitable menu items.
 */
export const DIETARY_TAGS: readonly DietaryTag[] = [
  {
    id: 'vegan',
    label: 'Vegan',
    icon: '🌱',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  {
    id: 'vegetarian',
    label: 'Vegetarian',
    icon: '🥬',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'gluten-free',
    label: 'Gluten-Free',
    icon: '🌾',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  {
    id: 'dairy-free',
    label: 'Dairy-Free',
    icon: '🥛',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  {
    id: 'nut-free',
    label: 'Nut-Free',
    icon: '🥜',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  {
    id: 'spicy',
    label: 'Spicy',
    icon: '🌶️',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  {
    id: 'halal',
    label: 'Halal',
    icon: '☪️',
    color: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  },
  {
    id: 'kosher',
    label: 'Kosher',
    icon: '✡️',
    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  },
  {
    id: 'organic',
    label: 'Organic',
    icon: '🍃',
    color: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  },
  {
    id: 'keto',
    label: 'Keto-Friendly',
    icon: '🥑',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
] as const;

/**
 * Common allergens for menu items.
 */
export const COMMON_ALLERGENS: readonly string[] = [
  'Milk',
  'Eggs',
  'Fish',
  'Shellfish',
  'Tree Nuts',
  'Peanuts',
  'Wheat',
  'Soybeans',
  'Sesame',
] as const;

/**
 * Get a dietary tag by ID.
 */
export function getDietaryTag(id: string): DietaryTag | undefined {
  return DIETARY_TAGS.find((tag) => tag.id === id);
}
