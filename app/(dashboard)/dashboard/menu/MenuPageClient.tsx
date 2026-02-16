'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, UtensilsCrossed, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CategoryList,
  MenuItemForm,
  MenuItemCard,
} from '@/modules/menu/components';
import type { Restaurant, MenuCategory, MenuItem } from '@/lib/database.types';

interface MenuPageClientProps {
  restaurant: Restaurant;
  userId: string;
  initialCategories: MenuCategory[];
  initialItems: MenuItem[];
}

export function MenuPageClient({
  restaurant,
  userId,
  initialCategories,
  initialItems,
}: MenuPageClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Filter items based on search, category, and availability
  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      // Category filter
      if (selectedCategoryId && item.category_id !== selectedCategoryId) {
        return false;
      }

      // Availability filter
      if (showAvailableOnly && !item.is_available) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDescription = item.description?.toLowerCase().includes(query);
        const matchesTags = item.dietary_tags.some((tag) =>
          tag.toLowerCase().includes(query)
        );
        return matchesName || matchesDescription || matchesTags;
      }

      return true;
    });
  }, [initialItems, selectedCategoryId, showAvailableOnly, searchQuery]);

  // Group items by category for display
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, MenuItem[]> = {};

    filteredItems.forEach((item) => {
      const categoryId = item.category_id || 'uncategorized';
      if (!grouped[categoryId]) {
        grouped[categoryId] = [];
      }
      grouped[categoryId].push(item);
    });

    return grouped;
  }, [filteredItems]);

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const getCategoryById = (id: string | null): MenuCategory | undefined => {
    return initialCategories.find((c) => c.id === id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Menu Management</h1>
          <p className="text-gray-400 mt-1">
            {initialItems.length} items across {initialCategories.length} categories
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg',
            'bg-electric-blue hover:bg-electric-blue/80',
            'text-white font-medium transition-colors'
          )}
        >
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-12 pr-4 py-3 rounded-lg',
              'bg-white/5 border border-white/10',
              'text-white placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent'
            )}
          />
        </div>

        {/* Availability Filter */}
        <button
          onClick={() => setShowAvailableOnly(!showAvailableOnly)}
          className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors',
            showAvailableOnly
              ? 'bg-electric-blue/20 border-electric-blue/50 text-electric-blue'
              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
          )}
        >
          <Filter className="w-5 h-5" />
          Available Only
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1">
          <CategoryList
            restaurantId={restaurant.id}
            categories={initialCategories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
          />
        </div>

        {/* Menu Items Grid */}
        <div className="lg:col-span-3">
          {filteredItems.length === 0 ? (
            <div className="bg-card border border-white/10 rounded-xl p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-4">
                <UtensilsCrossed className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {searchQuery || selectedCategoryId || showAvailableOnly
                  ? 'No items found'
                  : 'No menu items yet'}
              </h3>
              <p className="text-gray-400 mb-6">
                {searchQuery || selectedCategoryId || showAvailableOnly
                  ? 'Try adjusting your filters or search query'
                  : 'Start building your menu by adding your first item'}
              </p>
              {!searchQuery && !selectedCategoryId && !showAvailableOnly && (
                <button
                  onClick={() => setIsFormOpen(true)}
                  className={cn(
                    'inline-flex items-center gap-2 px-6 py-3 rounded-lg',
                    'bg-electric-blue hover:bg-electric-blue/80',
                    'text-white font-medium transition-colors'
                  )}
                >
                  <Plus className="w-5 h-5" />
                  Add First Item
                </button>
              )}
            </div>
          ) : selectedCategoryId ? (
            // Show items for selected category
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                {getCategoryById(selectedCategoryId)?.name || 'Uncategorized'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    category={getCategoryById(item.category_id)}
                    onEdit={handleEditItem}
                  />
                ))}
              </div>
            </div>
          ) : (
            // Show all items grouped by category
            <div className="space-y-8">
              {/* Uncategorized items first if any */}
              {itemsByCategory['uncategorized'] && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-white">Uncategorized</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {itemsByCategory['uncategorized'].map((item) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        onEdit={handleEditItem}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Categorized items */}
              {initialCategories.map((category) => {
                const categoryItems = itemsByCategory[category.id];
                if (!categoryItems || categoryItems.length === 0) return null;

                return (
                  <div key={category.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-white">{category.name}</h2>
                      {category.description && (
                        <p className="text-sm text-gray-400">{category.description}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {categoryItems.map((item) => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          category={category}
                          onEdit={handleEditItem}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Menu Item Form Slide-over */}
      {isFormOpen && (
        <MenuItemForm
          restaurantId={restaurant.id}
          userId={userId}
          categories={initialCategories}
          item={editingItem}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
