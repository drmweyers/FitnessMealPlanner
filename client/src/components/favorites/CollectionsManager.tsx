import { memo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { 
  Plus, 
  BookOpen, 
  Edit, 
  Trash2, 
  Share2, 
  Lock, 
  Globe,
  Search,
  MoreVertical,
  FolderPlus,
  Heart
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCollections } from '../../hooks/useCollections';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';

interface Collection {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  isPublic: boolean;
  tags: string[];
  recipeCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CollectionsManagerProps {
  className?: string;
  onCollectionSelect?: (collection: Collection) => void;
}

const CollectionsManager = memo(({ className, onCollectionSelect }: CollectionsManagerProps) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
    tags: [] as string[],
  });

  const { 
    collections, 
    isLoading, 
    createCollection, 
    updateCollection, 
    deleteCollection,
    isCreating,
    isUpdating,
    isDeleting,
  } = useCollections();

  const handleCreateCollection = useCallback(async () => {
    if (!formData.name.trim()) return;

    try {
      await createCollection({
        name: formData.name,
        description: formData.description,
        isPublic: formData.isPublic,
        tags: formData.tags,
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        isPublic: false,
        tags: [],
      });
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  }, [formData, createCollection]);

  const handleUpdateCollection = useCallback(async () => {
    if (!editingCollection || !formData.name.trim()) return;

    try {
      await updateCollection(editingCollection.id, {
        name: formData.name,
        description: formData.description,
        isPublic: formData.isPublic,
        tags: formData.tags,
      });

      setEditingCollection(null);
      setFormData({
        name: '',
        description: '',
        isPublic: false,
        tags: [],
      });
    } catch (error) {
      console.error('Failed to update collection:', error);
    }
  }, [editingCollection, formData, updateCollection]);

  const handleDeleteCollection = useCallback(async (collectionId: string) => {
    if (!confirm('Are you sure you want to delete this collection? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteCollection(collectionId);
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  }, [deleteCollection]);

  const startEditing = useCallback((collection: Collection) => {
    setEditingCollection(collection);
    setFormData({
      name: collection.name,
      description: collection.description || '',
      isPublic: collection.isPublic,
      tags: collection.tags,
    });
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingCollection(null);
    setFormData({
      name: '',
      description: '',
      isPublic: false,
      tags: [],
    });
  }, []);

  const openCreateModal = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      isPublic: false,
      tags: [],
    });
    setIsCreateModalOpen(true);
  }, []);

  const filteredCollections = collections?.filter(collection =>
    collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collection.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Recipe Collections</h2>
          <p className="text-gray-600">
            Organize your favorite recipes into collections
          </p>
        </div>

        <Button onClick={openCreateModal} className="whitespace-nowrap">
          <Plus className="h-4 w-4 mr-2" />
          New Collection
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search collections..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full mb-4" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredCollections.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="text-center">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No collections found' : 'No collections yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery 
                  ? 'Try adjusting your search query.'
                  : 'Create your first collection to organize your favorite recipes!'
                }
              </p>
              {!searchQuery && (
                <Button onClick={openCreateModal}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Collection
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collections Grid */}
      {!isLoading && filteredCollections.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCollections.map((collection) => (
            <Card 
              key={collection.id} 
              className="group hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => onCollectionSelect?.(collection)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      {collection.name}
                    </CardTitle>
                    {collection.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {collection.description}
                      </p>
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        startEditing(collection);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement sharing
                      }}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCollection(collection.id);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Cover Image Placeholder */}
                <div className="w-full h-24 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg mb-4 flex items-center justify-center border-2 border-dashed border-gray-200">
                  <Heart className="h-8 w-8 text-gray-400" />
                </div>

                {/* Meta Information */}
                <div className="space-y-3">
                  {/* Recipe Count */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {collection.recipeCount} recipe{collection.recipeCount !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-1">
                      {collection.isPublic ? (
                        <Globe className="h-4 w-4 text-green-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-xs text-gray-500">
                        {collection.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  {collection.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {collection.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {collection.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{collection.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Last Updated */}
                  <div className="text-xs text-gray-500">
                    Updated {new Date(collection.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Collection Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
            <DialogDescription>
              Organize your favorite recipes into a custom collection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Collection Name</Label>
              <Input
                id="name"
                placeholder="e.g., Quick Breakfasts"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe your collection..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="public"
                checked={formData.isPublic}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
              />
              <Label htmlFor="public" className="text-sm">
                Make this collection public
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCollection}
              disabled={!formData.name.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Collection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Collection Modal */}
      <Dialog open={!!editingCollection} onOpenChange={() => cancelEditing()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
            <DialogDescription>
              Update your collection details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Collection Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Quick Breakfasts"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                placeholder="Describe your collection..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-public"
                checked={formData.isPublic}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
              />
              <Label htmlFor="edit-public" className="text-sm">
                Make this collection public
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={cancelEditing}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateCollection}
              disabled={!formData.name.trim() || isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

CollectionsManager.displayName = 'CollectionsManager';

export default CollectionsManager;