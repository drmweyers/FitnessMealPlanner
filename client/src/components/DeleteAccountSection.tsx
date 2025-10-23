import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';

export function DeleteAccountSection() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDeleteAccount = async () => {
    if (!password || !confirmChecked) {
      setError('Please enter your password and confirm deletion');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await apiRequest('DELETE', '/api/account', {
        password,
        confirmDeletion: confirmChecked,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete account');
      }

      // Account deleted successfully
      toast({
        title: 'Account Deleted',
        description: 'Your account and all associated data have been permanently deleted.',
        variant: 'default',
      });

      // Close dialog
      setDialogOpen(false);

      // Logout and redirect after short delay
      setTimeout(() => {
        logout();
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setPassword('');
    setConfirmChecked(false);
    setError(null);
    setIsDeleting(false);
  };

  return (
    <div className="border border-red-200 rounded-lg p-6 bg-red-50">
      <div className="flex items-start space-x-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
        <div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Danger Zone
          </h3>
          <p className="text-sm text-red-700 mb-3">
            Once you delete your account, there is no going back. This action is permanent and irreversible.
          </p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium text-red-800 mb-2">
          This will permanently delete:
        </p>
        <ul className="text-sm text-red-700 space-y-1 list-disc list-inside ml-2">
          <li>Your profile and personal information</li>
          <li>All your meal plans and assignments</li>
          <li>Your grocery lists</li>
          <li>Your progress tracking data (measurements, photos, goals)</li>
          <li>Your trainer relationships</li>
          <li>All uploaded images (profile and progress photos)</li>
        </ul>
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete My Account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>Are you absolutely sure?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-4">
              <p className="text-sm">
                This action <span className="font-semibold text-red-600">cannot be undone</span>.
                This will permanently delete your account and remove all your data from our servers.
              </p>

              <div className="space-y-2">
                <label htmlFor="delete-password" className="text-sm font-medium text-gray-900">
                  Enter your password to confirm:
                </label>
                <Input
                  id="delete-password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isDeleting}
                  className="border-gray-300"
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="confirm-delete"
                  checked={confirmChecked}
                  onCheckedChange={(checked) => setConfirmChecked(checked as boolean)}
                  disabled={isDeleting}
                  className="mt-1"
                />
                <label
                  htmlFor="confirm-delete"
                  className="text-sm font-medium leading-tight text-gray-900 cursor-pointer"
                >
                  I understand this action cannot be undone and all my data will be permanently deleted
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-700 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetForm} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAccount();
              }}
              disabled={!password || !confirmChecked || isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
