'use client';

import { useState, useEffect } from 'react';
import { X, Plus, FolderPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCollections, createCollection, addToCollection, type Collection } from '@/actions/collections';
import { cn } from '@/lib/utils';

interface CollectionPickerProps {
  open: boolean;
  onClose: () => void;
  bookId: string;
  bookCollectionIds: string[];
  onSuccess?: () => void;
}

export function CollectionPicker({
  open,
  onClose,
  bookId,
  bookCollectionIds,
  onSuccess,
}: CollectionPickerProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadCollections();
    }
  }, [open]);

  const loadCollections = async () => {
    setLoading(true);
    const cols = await getCollections();
    setCollections(cols);
    setLoading(false);
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;

    setCreating(true);
    const result = await createCollection(newCollectionName.trim());
    if (result.success && result.collection) {
      // Add the book to the new collection
      await addToCollection(result.collection.id, bookId);
      setNewCollectionName('');
      await loadCollections();
      onSuccess?.();
    }
    setCreating(false);
  };

  const handleAddToCollection = async (collectionId: string) => {
    setAddingTo(collectionId);
    const result = await addToCollection(collectionId, bookId);
    if (result.success) {
      await loadCollections();
      onSuccess?.();
    }
    setAddingTo(null);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 z-50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto bg-card rounded shadow-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Add to Collection</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Create new collection */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex gap-2">
            <Input
              placeholder="New collection name..."
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
              className="flex-1 bg-secondary border-border"
            />
            <Button
              onClick={handleCreateCollection}
              disabled={!newCollectionName.trim() || creating}
              size="icon"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <FolderPlus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Collections list */}
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              Loading collections...
            </div>
          ) : collections.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <FolderPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No collections yet</p>
              <p className="text-sm">Create one above</p>
            </div>
          ) : (
            <div className="py-2">
              {collections.map((collection) => {
                const isInCollection = bookCollectionIds.includes(collection.id);
                const isAdding = addingTo === collection.id;

                return (
                  <button
                    key={collection.id}
                    onClick={() => !isInCollection && handleAddToCollection(collection.id)}
                    disabled={isInCollection || isAdding}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left',
                      isInCollection && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {/* Collection cover */}
                    <div className="w-10 h-14 rounded bg-secondary overflow-hidden flex-shrink-0">
                      {collection.coverUrl ? (
                        <img
                          src={collection.coverUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FolderPlus className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Collection info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium truncate">{collection.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {collection.itemCount} {collection.itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>

                    {/* Status */}
                    {isInCollection ? (
                      <Check className="w-5 h-5 text-primary" />
                    ) : isAdding ? (
                      <div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
