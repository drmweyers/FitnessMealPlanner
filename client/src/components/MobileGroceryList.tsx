import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Check,
  X,
  ChevronRight,
  Trash2,
  Edit,
  Download,
  Share,
  RotateCcw,
  SortAsc,
  Grid,
  List,
  Apple,
  Beef,
  Milk,
  Coffee,
  Wheat,
  Candy
} from 'lucide-react';
import { format } from 'date-fns';

interface GroceryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  isChecked: boolean;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  estimatedPrice?: number;
  brand?: string;
  recipeId?: string;
  recipeName?: string;
}

interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  order: number;
}

interface MobileGroceryListProps {
  mealPlanId?: string;
  items?: GroceryItem[];
  onItemsChange?: (items: GroceryItem[]) => void;
  className?: string;
}

const CATEGORIES: Category[] = [
  { id: 'produce', name: 'Produce', icon: Apple, color: 'bg-green-100 text-green-800', order: 1 },
  { id: 'meat', name: 'Meat & Seafood', icon: Beef, color: 'bg-red-100 text-red-800', order: 2 },
  { id: 'dairy', name: 'Dairy & Eggs', icon: Milk, color: 'bg-blue-100 text-blue-800', order: 3 },
  { id: 'pantry', name: 'Pantry', icon: Wheat, color: 'bg-yellow-100 text-yellow-800', order: 4 },
  { id: 'beverages', name: 'Beverages', icon: Coffee, color: 'bg-purple-100 text-purple-800', order: 5 },
  { id: 'snacks', name: 'Snacks', icon: Candy, color: 'bg-orange-100 text-orange-800', order: 6 },
];

const UNITS = ['pcs', 'lbs', 'oz', 'cups', 'tbsp', 'tsp', 'cloves', 'bunches', 'packages', 'cans', 'bottles'];

const MobileGroceryList: React.FC<MobileGroceryListProps> = ({
  mealPlanId,
  items: initialItems = [],
  onItemsChange,
  className = ''
}) => {
  const [items, setItems] = useState<GroceryItem[]>(initialItems);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'category'>('category');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'priority'>('category');
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<Partial<GroceryItem>>({
    name: '',
    category: 'produce',
    quantity: 1,
    unit: 'pcs',
    priority: 'medium'
  });
  const [swipeState, setSwipeState] = useState<{ itemId: string | null; direction: 'left' | 'right' | null }>({ itemId: null, direction: null });
  
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isSwiping = useRef<boolean>(false);
  
  const { toast } = useToast();

  // Generate sample data if no items provided
  useEffect(() => {
    if (initialItems.length === 0) {
      const sampleItems: GroceryItem[] = [
        { id: '1', name: 'Chicken Breast', category: 'meat', quantity: 2, unit: 'lbs', isChecked: false, priority: 'high', estimatedPrice: 12.99 },
        { id: '2', name: 'Broccoli', category: 'produce', quantity: 2, unit: 'bunches', isChecked: true, priority: 'medium', estimatedPrice: 3.99 },
        { id: '3', name: 'Brown Rice', category: 'pantry', quantity: 1, unit: 'packages', isChecked: false, priority: 'medium', estimatedPrice: 4.49 },
        { id: '4', name: 'Greek Yogurt', category: 'dairy', quantity: 2, unit: 'cups', isChecked: false, priority: 'medium', estimatedPrice: 5.99 },
        { id: '5', name: 'Spinach', category: 'produce', quantity: 1, unit: 'packages', isChecked: true, priority: 'medium', estimatedPrice: 2.99 },
        { id: '6', name: 'Olive Oil', category: 'pantry', quantity: 1, unit: 'bottles', isChecked: false, priority: 'low', estimatedPrice: 8.99 },
        { id: '7', name: 'Almonds', category: 'snacks', quantity: 1, unit: 'packages', isChecked: false, priority: 'low', estimatedPrice: 6.99 },
        { id: '8', name: 'Eggs', category: 'dairy', quantity: 12, unit: 'pcs', isChecked: false, priority: 'high', estimatedPrice: 3.49 },
      ];
      setItems(sampleItems);
    }
  }, [initialItems]);

  // Notify parent of changes
  useEffect(() => {
    if (onItemsChange) {
      onItemsChange(items);
    }
  }, [items, onItemsChange]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort items
    filtered.sort((a, b) => {
      // Checked items always go to bottom
      if (a.isChecked !== b.isChecked) {
        return a.isChecked ? 1 : -1;
      }

      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'category':
        default:
          const categoryOrder = CATEGORIES.reduce((acc, cat, index) => {
            acc[cat.id] = index;
            return acc;
          }, {} as Record<string, number>);
          return (categoryOrder[a.category] || 999) - (categoryOrder[b.category] || 999);
      }
    });

    return filtered;
  }, [items, searchTerm, selectedCategory, sortBy]);

  // Group items by category for category view
  const groupedItems = useMemo(() => {
    const groups: Record<string, GroceryItem[]> = {};
    
    filteredAndSortedItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });

    return CATEGORIES.map(category => ({
      ...category,
      items: groups[category.id] || []
    })).filter(category => category.items.length > 0);
  }, [filteredAndSortedItems]);

  // Touch handlers for swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent, itemId: string) => {
    if (!e.touches || !e.touches[0]) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent, itemId: string) => {
    if (!touchStartX.current || !touchStartY.current) return;
    if (!e.touches || !e.touches[0]) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;
    
    // Only start swiping if horizontal movement is significant and greater than vertical
    if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY) && !isSwiping.current) {
      isSwiping.current = true;
      
      if (deltaX > 0) {
        setSwipeState({ itemId, direction: 'right' });
      } else {
        setSwipeState({ itemId, direction: 'left' });
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent, itemId: string) => {
    if (isSwiping.current && swipeState.itemId === itemId) {
      const deltaX = (e.changedTouches[0]?.clientX || touchStartX.current) - touchStartX.current;
      
      if (Math.abs(deltaX) > 100) { // Minimum swipe distance
        if (swipeState.direction === 'right') {
          // Swipe right - mark as checked
          toggleItemChecked(itemId);
        } else if (swipeState.direction === 'left') {
          // Swipe left - delete item
          deleteItem(itemId);
        }
      }
    }
    
    // Reset swipe state
    setSwipeState({ itemId: null, direction: null });
    isSwiping.current = false;
    touchStartX.current = 0;
    touchStartY.current = 0;
  }, [swipeState]);

  const addItem = () => {
    if (!newItem.name?.trim()) {
      toast({
        title: 'Error',
        description: 'Item name is required',
        variant: 'destructive'
      });
      return;
    }

    const item: GroceryItem = {
      id: `item-${Date.now()}`,
      name: newItem.name.trim(),
      category: newItem.category || 'produce',
      quantity: newItem.quantity || 1,
      unit: newItem.unit || 'pcs',
      isChecked: false,
      priority: newItem.priority || 'medium',
      notes: newItem.notes,
      estimatedPrice: newItem.estimatedPrice
    };

    setItems(prev => [...prev, item]);
    setNewItem({ name: '', category: 'produce', quantity: 1, unit: 'pcs', priority: 'medium' });
    setIsAdding(false);

    toast({
      title: 'Success',
      description: 'Item added to grocery list',
    });
  };

  const toggleItemChecked = (itemId: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
    ));
  };

  const deleteItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    toast({
      title: 'Item removed',
      description: 'Item deleted from grocery list',
    });
  };

  const clearCheckedItems = () => {
    setItems(prev => prev.filter(item => !item.isChecked));
    toast({
      title: 'Checked items cleared',
      description: 'All completed items have been removed',
    });
  };

  const exportList = () => {
    const listText = items
      .filter(item => !item.isChecked)
      .map(item => `• ${item.quantity} ${item.unit} ${item.name}${item.notes ? ` (${item.notes})` : ''}`)
      .join('\n');
    
    if (navigator.share) {
      navigator.share({
        title: 'Grocery List',
        text: `Grocery List - ${format(new Date(), 'MMM d, yyyy')}\n\n${listText}`,
      });
    } else {
      // Fallback for desktop
      const blob = new Blob([`Grocery List - ${format(new Date(), 'MMM d, yyyy')}\n\n${listText}`], 
        { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `grocery-list-${format(new Date(), 'yyyy-MM-dd')}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const completedItems = items.filter(item => item.isChecked).length;
  const totalItems = items.length;
  const estimatedTotal = items
    .filter(item => !item.isChecked && item.estimatedPrice)
    .reduce((sum, item) => sum + (item.estimatedPrice || 0), 0);

  const CategoryIcon = ({ category }: { category: Category }) => {
    const Icon = category.icon;
    return <Icon className="h-5 w-5" />;
  };

  const ItemRow: React.FC<{ item: GroceryItem; showCategory?: boolean }> = ({ item, showCategory = true }) => {
    const category = CATEGORIES.find(cat => cat.id === item.category);
    const isSwipingThis = swipeState.itemId === item.id;
    
    return (
      <div 
        className={`relative overflow-hidden transition-transform duration-200 ${
          isSwipingThis 
            ? swipeState.direction === 'right' 
              ? 'bg-green-50 translate-x-2' 
              : 'bg-red-50 -translate-x-2'
            : ''
        }`}
        onTouchStart={(e) => handleTouchStart(e, item.id)}
        onTouchMove={(e) => handleTouchMove(e, item.id)}
        onTouchEnd={(e) => handleTouchEnd(e, item.id)}
      >
        <div className={`flex items-center gap-3 p-4 border-b transition-opacity ${
          item.isChecked ? 'opacity-50' : ''
        }`}>
          <div 
            className="flex-shrink-0 cursor-pointer touch-target p-2 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleItemChecked(item.id);
            }}
            role="button"
            tabIndex={0}
            aria-label={`${item.isChecked ? 'Uncheck' : 'Check'} ${item.name}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleItemChecked(item.id);
              }
            }}
          >
            <Checkbox 
              checked={item.isChecked} 
              onChange={() => toggleItemChecked(item.id)} 
              className="h-6 w-6 touch-target-checkbox"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-medium text-base leading-tight grocery-item-text ${item.isChecked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {item.quantity} {item.unit} {item.name}
              </span>
              {item.priority === 'high' && (
                <Badge variant="destructive" className="text-xs">High</Badge>
              )}
              {item.brand && (
                <Badge variant="outline" className="text-xs">{item.brand}</Badge>
              )}
            </div>
            
            {showCategory && category && (
              <div className="flex items-center gap-1 mt-1">
                <CategoryIcon category={category} />
                <span className="text-sm text-muted-foreground grocery-item-text">{category.name}</span>
              </div>
            )}
            
            {item.notes && (
              <p className="text-sm text-muted-foreground mt-1 grocery-item-text">{item.notes}</p>
            )}
          </div>
          
          {item.estimatedPrice && (
            <div className="text-right">
              <span className="text-sm font-medium grocery-item-text">${item.estimatedPrice.toFixed(2)}</span>
            </div>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 touch-target">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toggleItemChecked(item.id)}>
                {item.isChecked ? (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Uncheck
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Check Off
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => deleteItem(item.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Grocery List</h1>
              <p className="text-sm text-muted-foreground">
                {completedItems}/{totalItems} items completed
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'list' ? 'category' : 'list')}
                className="touch-target"
              >
                {viewMode === 'list' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="touch-target">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportList}>
                    <Share className="mr-2 h-4 w-4" />
                    Share List
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={clearCheckedItems}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Completed
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setSortBy('category')}>
                    <input type="radio" checked={sortBy === 'category'} onChange={() => {}} className="mr-2" />
                    Category
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('name')}>
                    <input type="radio" checked={sortBy === 'name'} onChange={() => {}} className="mr-2" />
                    Name
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('priority')}>
                    <input type="radio" checked={sortBy === 'priority'} onChange={() => {}} className="mr-2" />
                    Priority
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Search and Add */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 touch-target"
              />
            </div>

            {isAdding ? (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Input
                        placeholder="Item name"
                        value={newItem.name}
                        onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                        className="touch-target"
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                        className="touch-target"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full p-2 border rounded-md touch-target bg-background"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <select
                      value={newItem.unit}
                      onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full p-2 border rounded-md touch-target bg-background"
                    >
                      {UNITS.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addItem} size="sm" className="flex-1 touch-target">
                      Add Item
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsAdding(false)}
                      className="touch-target"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button onClick={() => setIsAdding(true)} className="w-full touch-target">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            )}
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 mt-4 hide-scrollbar">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="touch-target whitespace-nowrap"
            >
              All ({totalItems})
            </Button>
            {CATEGORIES.map(category => {
              const count = items.filter(item => item.category === category.id).length;
              return count > 0 ? (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="touch-target whitespace-nowrap"
                >
                  <CategoryIcon category={category} />
                  <span className="ml-1">{category.name} ({count})</span>
                </Button>
              ) : null;
            })}
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="pb-20">
        {viewMode === 'category' ? (
          <div className="space-y-4">
            {groupedItems.map(category => (
              <div key={category.id}>
                <div className={`sticky top-[140px] z-40 px-4 py-2 ${category.color} border-y`}>
                  <div className="flex items-center gap-2">
                    <CategoryIcon category={category} />
                    <span className="font-medium">{category.name}</span>
                    <Badge variant="outline" className="ml-auto">
                      {category.items.length}
                    </Badge>
                  </div>
                </div>
                <div>
                  {category.items.map(item => (
                    <ItemRow key={item.id} item={item} showCategory={false} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {filteredAndSortedItems.map(item => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        )}

        {filteredAndSortedItems.length === 0 && (
          <div className="text-center py-12 px-4">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No items found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search' : 'Start by adding some items to your grocery list'}
            </p>
            {!isAdding && (
              <Button onClick={() => setIsAdding(true)} className="touch-target">
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Summary (Sticky) */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 safe-area-bottom">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {totalItems - completedItems} items remaining
              </p>
              {estimatedTotal > 0 && (
                <p className="text-sm text-muted-foreground">
                  Est. total: ${estimatedTotal.toFixed(2)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearCheckedItems}
                disabled={completedItems === 0}
                className="touch-target"
              >
                Clear Done ({completedItems})
              </Button>
              <Button size="sm" onClick={exportList} className="touch-target">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileGroceryList;