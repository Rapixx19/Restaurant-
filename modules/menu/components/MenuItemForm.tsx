'use client';

import { useState, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { X, Upload, Loader2, ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createMenuItem, updateMenuItem } from '../actions/menuItemActions';
import { DIETARY_TAGS, COMMON_ALLERGENS } from '../constants';
import type { MenuItem, MenuCategory, MenuFormState } from '../types';

interface MenuItemFormProps {
  restaurantId: string;
  userId: string;
  categories: MenuCategory[];
  item?: MenuItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const initialState: MenuFormState = {
  error: null,
  success: false,
};

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        'flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg',
        'bg-electric-blue hover:bg-electric-blue/80 text-white font-medium',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors'
      )}
    >
      {pending ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Saving...
        </>
      ) : isEditing ? (
        'Update Item'
      ) : (
        'Add Item'
      )}
    </button>
  );
}

export function MenuItemForm({
  restaurantId,
  userId,
  categories,
  item,
  onClose,
  onSuccess,
}: MenuItemFormProps) {
  const isEditing = !!item;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageUrl, setImageUrl] = useState(item?.image_url || '');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>(item?.dietary_tags || []);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(item?.allergens || []);

  const actionFn = isEditing
    ? updateMenuItem.bind(null, item.id)
    : createMenuItem.bind(null, restaurantId);

  const [state, formAction] = useFormState(
    async (prevState: MenuFormState, formData: FormData) => {
      // Add hidden fields
      formData.set('image_url', imageUrl);
      formData.set('dietary_tags', selectedTags.join(','));
      formData.set('allergens', selectedAllergens.join(','));

      const result = await actionFn(prevState, formData);
      if (result.success) {
        onSuccess?.();
        onClose();
      }
      return result;
    },
    initialState
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    setImageError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-menu-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.error) {
        setImageError(data.error);
      } else if (data.url) {
        setImageUrl(data.url);
      }
    } catch {
      setImageError('Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen]
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="absolute inset-y-0 right-0 w-full max-w-lg">
        <div className="h-full bg-card border-l border-white/10 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">
              {isEditing ? 'Edit Menu Item' : 'Add Menu Item'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form action={formAction} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {state.error && (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{state.error}</p>
                </div>
              )}

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Image</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'relative w-full aspect-video rounded-lg border-2 border-dashed cursor-pointer overflow-hidden',
                    'border-white/20 hover:border-electric-blue/50 transition-colors',
                    'flex items-center justify-center'
                  )}
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : imageUploading ? (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-sm">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <ImageIcon className="w-12 h-12" />
                      <span className="text-sm">Click to upload image</span>
                      <span className="text-xs text-gray-500">JPEG, PNG, WebP (max 5MB)</span>
                    </div>
                  )}
                  {imageUrl && !imageUploading && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {imageError && (
                  <p className="text-sm text-red-400">{imageError}</p>
                )}
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={item?.name || ''}
                  required
                  placeholder="e.g., Margherita Pizza"
                  className={cn(
                    'w-full px-4 py-3 rounded-lg',
                    'bg-white/5 border border-white/10',
                    'text-white placeholder-gray-500',
                    'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent'
                  )}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Description</label>
                <textarea
                  name="description"
                  defaultValue={item?.description || ''}
                  rows={3}
                  placeholder="Describe your dish..."
                  className={cn(
                    'w-full px-4 py-3 rounded-lg resize-none',
                    'bg-white/5 border border-white/10',
                    'text-white placeholder-gray-500',
                    'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent'
                  )}
                />
              </div>

              {/* Price and Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Price <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      name="price"
                      defaultValue={item?.price || ''}
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className={cn(
                        'w-full pl-8 pr-4 py-3 rounded-lg',
                        'bg-white/5 border border-white/10',
                        'text-white placeholder-gray-500',
                        'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent'
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Category</label>
                  <select
                    name="category_id"
                    defaultValue={item?.category_id || ''}
                    className={cn(
                      'w-full px-4 py-3 rounded-lg',
                      'bg-white/5 border border-white/10',
                      'text-white',
                      'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent'
                    )}
                  >
                    <option value="">No category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_available"
                    value="true"
                    defaultChecked={item?.is_available ?? true}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-electric-blue focus:ring-electric-blue"
                  />
                  <span className="text-sm text-gray-300">Available</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_featured"
                    value="true"
                    defaultChecked={item?.is_featured ?? false}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-electric-blue focus:ring-electric-blue"
                  />
                  <span className="text-sm text-gray-300">Featured</span>
                </label>
              </div>

              {/* Dietary Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Dietary Tags</label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_TAGS.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm border transition-colors',
                        selectedTags.includes(tag.id)
                          ? tag.color
                          : 'border-white/10 text-gray-400 hover:border-white/20'
                      )}
                    >
                      {tag.icon} {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allergens */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Contains Allergens</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_ALLERGENS.map((allergen) => (
                    <button
                      key={allergen}
                      type="button"
                      onClick={() => toggleAllergen(allergen)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm border transition-colors',
                        selectedAllergens.includes(allergen)
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : 'border-white/10 text-gray-400 hover:border-white/20'
                      )}
                    >
                      {allergen}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 px-6 py-4 bg-card border-t border-white/10 flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 font-medium transition-colors"
              >
                Cancel
              </button>
              <SubmitButton isEditing={isEditing} />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
