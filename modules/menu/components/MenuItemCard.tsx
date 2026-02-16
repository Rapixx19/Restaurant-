'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { Pencil, Trash2, Star, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleItemAvailability, deleteMenuItem } from '../actions/menuItemActions';
import { getDietaryTag } from '../constants';
import type { MenuItem, MenuCategory } from '../types';

interface MenuItemCardProps {
  item: MenuItem;
  category?: MenuCategory | null;
  onEdit: (item: MenuItem) => void;
}

export function MenuItemCard({ item, category, onEdit }: MenuItemCardProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticAvailable, setOptimisticAvailable] = useOptimistic(
    item.is_available,
    (_, newValue: boolean) => newValue
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleAvailability = () => {
    const newValue = !optimisticAvailable;
    startTransition(async () => {
      setOptimisticAvailable(newValue);
      const result = await toggleItemAvailability(item.id, newValue);
      if (result.error) {
        // Revert on error
        setOptimisticAvailable(!newValue);
      }
    });
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    setIsDeleting(true);
    const result = await deleteMenuItem(item.id);
    if (result.error) {
      alert(result.error);
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={cn(
        'group bg-card border border-white/10 rounded-xl overflow-hidden transition-all hover:border-white/20',
        !optimisticAvailable && 'opacity-60',
        isDeleting && 'animate-pulse pointer-events-none'
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-white/5">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <ImageIcon className="w-12 h-12" />
          </div>
        )}

        {/* Featured badge */}
        {item.is_featured && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500/90 text-black text-xs font-medium rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />
            Featured
          </div>
        )}

        {/* Actions */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(item)}
            className="p-2 rounded-lg bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 rounded-lg bg-black/50 backdrop-blur-sm text-red-400 hover:bg-red-500/50 hover:text-white transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Unavailable overlay */}
        {!optimisticAvailable && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="px-3 py-1.5 bg-red-500/80 text-white text-sm font-medium rounded-full">
              Unavailable
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category badge */}
        {category && (
          <span className="inline-block px-2 py-0.5 text-xs font-medium text-electric-blue bg-electric-blue/10 rounded mb-2">
            {category.name}
          </span>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{item.name}</h3>
            {item.description && (
              <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                {item.description}
              </p>
            )}
          </div>
          <span className="text-lg font-bold text-electric-blue whitespace-nowrap">
            ${item.price.toFixed(2)}
          </span>
        </div>

        {/* Dietary tags */}
        {item.dietary_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {item.dietary_tags.map((tagId) => {
              const tag = getDietaryTag(tagId);
              return tag ? (
                <span
                  key={tagId}
                  className={cn(
                    'px-2 py-0.5 text-xs rounded-full border',
                    tag.color
                  )}
                  title={tag.label}
                >
                  {tag.icon}
                </span>
              ) : null;
            })}
          </div>
        )}

        {/* Allergens */}
        {item.allergens.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Contains: {item.allergens.join(', ')}
          </p>
        )}

        {/* Availability toggle */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-sm text-gray-400">Availability</span>
          <button
            onClick={handleToggleAvailability}
            disabled={isPending}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors',
              optimisticAvailable ? 'bg-green-500' : 'bg-gray-600',
              isPending && 'opacity-50'
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                optimisticAvailable ? 'left-[22px]' : 'left-0.5'
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
