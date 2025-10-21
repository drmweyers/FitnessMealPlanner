import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useGroceryLists,
  useCreateGroceryList,
  useGroceryList,
} from '@/hooks/useGroceryLists';
import MobileGroceryList from './MobileGroceryList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  ShoppingCart,
  List,
  AlertCircle,
  RefreshCw,
  Search,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface GroceryListWrapperProps {
  mealPlanId?: string;
  className?: string;
  activeMealPlan?: any; // Will be typed as EnhancedMealPlan from Customer.tsx
}

const GroceryListWrapper: React.FC<GroceryListWrapperProps> = ({
  mealPlanId,
  className = '',
  activeMealPlan
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State for list management
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showListSelector, setShowListSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // API hooks
  const { data: groceryLists, isLoading: listsLoading, error: listsError, refetch: refetchLists } = useGroceryLists();
  const createListMutation = useCreateGroceryList();
  const { data: selectedList, isLoading: listLoading, error: listError } = useGroceryList(selectedListId);

  // Filter and paginate lists
  const filteredLists = useMemo(() => {
    if (!Array.isArray(groceryLists)) return [];

    // Filter by search term
    const filtered = groceryLists.filter(list =>
      list && list.id && list.name &&
      list.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort by items count (desc) and then by name
    filtered.sort((a, b) => {
      const aItems = parseInt(a.itemCount) || 0;
      const bItems = parseInt(b.itemCount) || 0;
      if (aItems !== bItems) return bItems - aItems;
      return (a.name || '').localeCompare(b.name || '');
    });

    return filtered;
  }, [groceryLists, searchTerm]);

  // Paginated lists
  const paginatedLists = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLists.slice(startIndex, endIndex);
  }, [filteredLists, currentPage]);

  const totalPages = Math.ceil(filteredLists.length / itemsPerPage);

  // Auto-select first list with items or create default if none exist
  useEffect(() => {
    console.log('[GroceryListWrapper] Auto-selection effect:', {
      listsLoading,
      groceryListsLength: groceryLists?.length,
      selectedListId,
      groceryLists
    });

    if (!listsLoading && Array.isArray(groceryLists) && groceryLists.length > 0 && !selectedListId) {
      // Prioritize lists with items
      const listsWithItems = groceryLists.filter(list =>
        list && list.id && list.name && parseInt(list.itemCount) > 0
      );
      const validLists = groceryLists.filter(list =>
        list && list.id && list.name
      );

      console.log('[GroceryListWrapper] Found lists:', {
        listsWithItems: listsWithItems.length,
        validLists: validLists.length
      });

      if (listsWithItems.length > 0) {
        console.log('[GroceryListWrapper] Auto-selecting list with items:', listsWithItems[0].id);
        setSelectedListId(listsWithItems[0].id);
      } else if (validLists.length > 0) {
        // Select special lists first
        const specialList = validLists.find(list =>
          list.name === 'Weekly Shopping List' ||
          list.name === 'Test Grocery List' ||
          list.name === 'API Test Grocery List'
        );
        const listToSelect = specialList ? specialList.id : validLists[0].id;
        console.log('[GroceryListWrapper] Auto-selecting valid list:', listToSelect);
        setSelectedListId(listToSelect);
      }
    } else if (!listsLoading && Array.isArray(groceryLists) && groceryLists.length === 0 && !selectedListId) {
      // No lists exist, create a default one
      console.log('[GroceryListWrapper] No lists exist, creating default');
      createDefaultList();
    }
  }, [groceryLists, listsLoading, selectedListId]);

  const createDefaultList = async () => {
    if (!user) return;

    try {
      await createListMutation.mutateAsync({
        name: 'My Grocery List',
      });
      // The mutation will update the cache and trigger a re-render
    } catch (error) {
      console.error('Failed to create default grocery list:', error);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a list name',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await createListMutation.mutateAsync({
        name: newListName.trim(),
        mealPlanId,
      });

      // Select the newly created list
      setSelectedListId(result.data.id);
      setNewListName('');
      setIsCreatingList(false);

      toast({
        title: 'Success',
        description: 'New grocery list created',
      });
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Failed to create grocery list:', error);
    }
  };

  const handleListChange = (listId: string) => {
    setSelectedListId(listId);
    setShowListSelector(false);
  };

  // Handle loading state
  if (listsLoading) {
    return (
      <div className={`min-h-screen bg-background ${className} flex items-center justify-center`}>
        <div className="text-center space-y-4">
          <div className="relative">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground/30" />
            <Loader2 className="h-8 w-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Loading your grocery lists</h3>
            <p className="text-muted-foreground text-sm">Organizing your shopping items...</p>
          </div>
          <div className="flex justify-center gap-1">
            <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 bg-primary rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (listsError) {
    return (
      <div className={`min-h-screen bg-background ${className} flex items-center justify-center`}>
        <div className="text-center px-4">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive/50" />
          <h3 className="text-lg font-medium mb-2 text-destructive">Failed to load grocery lists</h3>
          <p className="text-muted-foreground mb-4">
            {listsError instanceof Error ? listsError.message : 'Something went wrong'}
          </p>
          <Button onClick={() => refetchLists()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Show loading state while lists are being fetched
  if (listsLoading) {
    return (
      <div className={`min-h-screen bg-background ${className}`}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your grocery lists...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show list selector/creator if no list is selected (but only after loading)
  if (!selectedListId || showListSelector || isCreatingList) {
    return (
      <div className={`min-h-screen bg-background ${className}`}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-purple-500/25">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Grocery Lists</h1>
              <p className="text-muted-foreground">
                {Array.isArray(groceryLists) && groceryLists.length > 0
                  ? 'Select a list or create a new one'
                  : 'Create your first grocery list'}
              </p>
            </div>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5" />
                  {isCreatingList ? 'Create New List' : 'Your Lists'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isCreatingList && Array.isArray(groceryLists) && groceryLists.length > 0 && (
                  <>
                    {/* Search bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search lists..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="pl-10"
                      />
                    </div>

                    {/* Lists */}
                    <div className="space-y-2">
                      {paginatedLists.map((list) => (
                        <Button
                          key={list.id}
                          variant="outline"
                          className="w-full justify-between h-12"
                          onClick={() => handleListChange(list.id)}
                        >
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            <span className="truncate">{list.name || 'Unnamed List'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {parseInt(list.itemCount) > 0 && (
                              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {list.itemCount}
                              </span>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <div className="text-center text-xs text-muted-foreground">
                      {filteredLists.length} lists total
                    </div>
                  </>
                )}

                {isCreatingList ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">List Name</label>
                      <Input
                        placeholder="e.g., Weekly Shopping, Meal Prep"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateList();
                          } else if (e.key === 'Escape') {
                            setIsCreatingList(false);
                            setNewListName('');
                          }
                        }}
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCreateList}
                        disabled={createListMutation.isPending || !newListName.trim()}
                        className="flex-1"
                      >
                        {createListMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Create List
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsCreatingList(false);
                          setNewListName('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setIsCreatingList(true)}
                    className="w-full"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New List
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Show the grocery list interface
  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {/* List Switcher Header (only show if multiple lists exist) */}
      {Array.isArray(groceryLists) && groceryLists.length > 1 && (
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      <span className="truncate max-w-[150px]">
                        {selectedList?.name || 'Select List'}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuLabel>Switch Lists</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Array.isArray(groceryLists) && groceryLists.filter(list => list && list.id && list.name).map((list) => (
                      <DropdownMenuItem
                        key={list.id}
                        onClick={() => handleListChange(list.id)}
                        className={selectedListId === list.id ? 'bg-accent' : ''}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            <span>{list.name || 'Unnamed List'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {list.items?.length || 0}
                            </span>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsCreatingList(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New List
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* List count badge */}
                {Array.isArray(groceryLists) && groceryLists.length > 10 && (
                  <span className="text-xs bg-muted px-2 py-1 rounded-full">
                    {groceryLists.length} lists
                  </span>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowListSelector(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Grocery List Component */}
      {selectedListId && (
        <MobileGroceryList
          groceryListId={selectedListId}
          mealPlanId={mealPlanId}
          activeMealPlan={activeMealPlan}
          className={className}
        />
      )}
    </div>
  );
};

export default GroceryListWrapper;