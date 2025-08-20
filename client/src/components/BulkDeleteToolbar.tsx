import React, { useState } from "react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Trash2, X, Check } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface BulkDeleteToolbarProps {
  selectedCount: number;
  totalCount: number;
  isAllSelected: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  isDeleting?: boolean;
}

export default function BulkDeleteToolbar({
  selectedCount,
  totalCount,
  isAllSelected,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  isDeleting = false,
}: BulkDeleteToolbarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    onBulkDelete();
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4 mb-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={onSelectAll}
              className="border-primary"
            />
            <span className="text-sm sm:text-base font-medium text-slate-700">
              {selectedCount === 0
                ? "Select recipes"
                : selectedCount === totalCount
                ? `All ${totalCount} recipes selected`
                : `${selectedCount} of ${totalCount} recipes selected`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? "Deleting..." : `Delete ${selectedCount}`}
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="text-slate-600 hover:bg-slate-100"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Recipes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} recipe{selectedCount === 1 ? '' : 's'}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete {selectedCount} Recipe{selectedCount === 1 ? '' : 's'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}