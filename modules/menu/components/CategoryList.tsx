'use client';

import { useState, useTransition } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import {
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  X,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '../actions/categoryActions';
import type { MenuCategory, MenuFormState } from '../types';

interface CategoryListProps {
  restaurantId: string;
  categories: MenuCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

const initialState: MenuFormState = {
  error: null,
  success: false,
};

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-2 rounded-lg',
        'bg-electric-blue hover:bg-electric-blue/80 text-white font-medium',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors'
      )}
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
}

export function CategoryList({
  restaurantId,
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategoryListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const createWithId = createCategory.bind(null, restaurantId);
  const [createState, createAction] = useFormState(createWithId, initialState);

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...categories];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    const ids = newOrder.map((c) => c.id);
    startTransition(() => {
      reorderCategories(restaurantId, ids);
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= categories.length - 1) return;
    const newOrder = [...categories];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    const ids = newOrder.map((c) => c.id);
    startTransition(() => {
      reorderCategories(restaurantId, ids);
    });
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    startTransition(async () => {
      const result = await deleteCategory(categoryId);
      if (result.error) {
        alert(result.error);
      }
      if (selectedCategoryId === categoryId) {
        onSelectCategory(null);
      }
    });
  };

  return (
    <div className="bg-card border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Categories</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={cn(
            'p-2 rounded-lg transition-colors',
            isAdding
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-electric-blue/20 text-electric-blue hover:bg-electric-blue/30'
          )}
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {/* Add Category Form */}
      {isAdding && (
        <form
          action={(formData) => {
            createAction(formData);
            if (createState.success) {
              setIsAdding(false);
            }
          }}
          className="mb-4 p-3 bg-white/5 rounded-lg space-y-3"
        >
          <input
            type="text"
            name="name"
            placeholder="Category name"
            required
            className={cn(
              'w-full px-3 py-2 rounded-lg',
              'bg-white/5 border border-white/10',
              'text-white placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-electric-blue'
            )}
          />
          <textarea
            name="description"
            placeholder="Description (optional)"
            rows={2}
            className={cn(
              'w-full px-3 py-2 rounded-lg resize-none',
              'bg-white/5 border border-white/10',
              'text-white placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-electric-blue'
            )}
          />
          {createState.error && (
            <p className="text-sm text-red-400">{createState.error}</p>
          )}
          <div className="flex gap-2">
            <SubmitButton>Add Category</SubmitButton>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* All Items */}
      <button
        onClick={() => onSelectCategory(null)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors mb-2',
          selectedCategoryId === null
            ? 'bg-electric-blue/20 text-electric-blue'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        )}
      >
        <FolderOpen className="w-4 h-4" />
        <span className="font-medium">All Items</span>
      </button>

      {/* Category List */}
      <div className="space-y-1">
        {categories.map((category, index) => (
          <CategoryItem
            key={category.id}
            category={category}
            isSelected={selectedCategoryId === category.id}
            isEditing={editingId === category.id}
            isFirst={index === 0}
            isLast={index === categories.length - 1}
            isPending={isPending}
            onSelect={() => onSelectCategory(category.id)}
            onEdit={() => setEditingId(category.id)}
            onCancelEdit={() => setEditingId(null)}
            onMoveUp={() => handleMoveUp(index)}
            onMoveDown={() => handleMoveDown(index)}
            onDelete={() => handleDelete(category.id)}
          />
        ))}
      </div>

      {categories.length === 0 && !isAdding && (
        <div className="text-center py-8 text-gray-500">
          <p>No categories yet</p>
          <p className="text-sm">Click + to add your first category</p>
        </div>
      )}
    </div>
  );
}

interface CategoryItemProps {
  category: MenuCategory;
  isSelected: boolean;
  isEditing: boolean;
  isFirst: boolean;
  isLast: boolean;
  isPending: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

function CategoryItem({
  category,
  isSelected,
  isEditing,
  isFirst,
  isLast,
  isPending,
  onSelect,
  onEdit,
  onCancelEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: CategoryItemProps) {
  const updateWithId = updateCategory.bind(null, category.id);
  const [updateState, updateAction] = useFormState(updateWithId, initialState);

  if (isEditing) {
    return (
      <form
        action={(formData) => {
          updateAction(formData);
          if (!updateState.error) {
            onCancelEdit();
          }
        }}
        className="p-3 bg-white/5 rounded-lg space-y-3"
      >
        <input
          type="text"
          name="name"
          defaultValue={category.name}
          required
          className={cn(
            'w-full px-3 py-2 rounded-lg',
            'bg-white/5 border border-white/10',
            'text-white placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-electric-blue'
          )}
        />
        <textarea
          name="description"
          defaultValue={category.description || ''}
          placeholder="Description (optional)"
          rows={2}
          className={cn(
            'w-full px-3 py-2 rounded-lg resize-none',
            'bg-white/5 border border-white/10',
            'text-white placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-electric-blue'
          )}
        />
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            name="is_active"
            value="true"
            defaultChecked={category.is_active}
            className="rounded border-white/20 bg-white/5 text-electric-blue focus:ring-electric-blue"
          />
          Active
        </label>
        {updateState.error && (
          <p className="text-sm text-red-400">{updateState.error}</p>
        )}
        <div className="flex gap-2">
          <SubmitButton>Save</SubmitButton>
          <button
            type="button"
            onClick={onCancelEdit}
            className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors',
        isSelected
          ? 'bg-electric-blue/20 text-electric-blue'
          : 'text-gray-400 hover:text-white hover:bg-white/5',
        !category.is_active && 'opacity-50'
      )}
    >
      <button
        onClick={onSelect}
        className="flex-1 text-left font-medium truncate"
      >
        {category.name}
      </button>

      <div className="hidden group-hover:flex items-center gap-1">
        <button
          onClick={onMoveUp}
          disabled={isFirst || isPending}
          className="p-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move up"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast || isPending}
          className="p-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move down"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        <button
          onClick={onEdit}
          className="p-1 rounded hover:bg-white/10"
          title="Edit"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded hover:bg-red-500/20 text-red-400"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
