import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Share2, Copy, ExternalLink, Eye, Calendar, Trash2, Settings, Link, ChevronDown, Facebook, Twitter, Mail, MessageCircle, Instagram } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface ShareInfo {
  shareToken: string;
  shareUrl: string;
  expiresAt: string | null;
  viewCount: number;
  createdAt: string;
  isActive?: boolean;
  message?: string;
}

interface ShareMealPlanButtonProps {
  mealPlanId: string;
  mealPlanName: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const ShareMealPlanButton: React.FC<ShareMealPlanButtonProps> = ({
  mealPlanId,
  mealPlanName,
  disabled = false,
  variant = 'outline',
  size = 'default',
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const { toast } = useToast();

  const createShare = async (customExpirationDate?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/meal-plans/${mealPlanId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mealPlanId,
          ...(customExpirationDate && { expiresAt: customExpirationDate }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create share link');
      }

      const data = await response.json();
      setShareInfo(data);

      toast({
        title: 'Share link created!',
        description: data.message || 'Your meal plan share link has been created successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create share link',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: 'Share link copied to clipboard',
      });
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast({
          title: 'Copied!',
          description: 'Share link copied to clipboard',
        });
      } catch (fallbackError) {
        toast({
          title: 'Error',
          description: 'Failed to copy to clipboard',
          variant: 'destructive',
        });
      }
      document.body.removeChild(textArea);
    }
  };

  const openShareLink = () => {
    if (shareInfo) {
      window.open(shareInfo.shareUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const shareToSocial = (platform: string) => {
    if (!shareInfo) return;
    
    const shareText = `Check out my meal plan: "${mealPlanName}"`;
    const shareUrl = shareInfo.shareUrl;
    
    let socialUrl = '';
    
    switch (platform) {
      case 'facebook':
        socialUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
        break;
      case 'twitter':
        socialUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=mealplanning,fitness,health`;
        break;
      case 'whatsapp':
        socialUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
        break;
      case 'email':
        socialUrl = `mailto:?subject=${encodeURIComponent(`Meal Plan: ${mealPlanName}`)}&body=${encodeURIComponent(`Hi!\n\nI wanted to share my meal plan with you: "${mealPlanName}"\n\nYou can view it here: ${shareUrl}\n\nEnjoy!\n`)}`;
        break;
      case 'instagram': {
        // Instagram doesn't allow direct sharing, so copy to clipboard with instructions
        const instagramText = `${shareText}\n\n${shareUrl}\n\n#mealplanning #fitness #health`;
        copyToClipboard(instagramText);
        toast({
          title: 'Copied for Instagram!',
          description: 'Text copied to clipboard. Paste it in your Instagram post or story.',
        });
        return;
      }
    }
    
    if (socialUrl) {
      window.open(socialUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
    }
  };

  const revokeShare = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/meal-plans/${mealPlanId}/share`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revoke share link');
      }

      setShareInfo(null);
      toast({
        title: 'Share revoked',
        description: 'The share link has been deactivated and is no longer accessible.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to revoke share link',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateShare = () => {
    const expiration = expirationDate ? new Date(expirationDate).toISOString() : undefined;
    createShare(expiration);
  };

  const formatExpirationDate = (dateString: string | null) => {
    if (!dateString) return 'Never expires';
    const date = new Date(dateString);
    const now = new Date();
    
    if (date < now) {
      return `Expired ${formatDistanceToNow(date)} ago`;
    }
    
    return `Expires ${formatDistanceToNow(date)} from now`;
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled}
          className={className}
          onClick={() => setIsDialogOpen(true)}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Meal Plan
          </DialogTitle>
          <DialogDescription>
            Create a shareable link for "{mealPlanName}" that others can view without logging in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!shareInfo ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="expiration">Expiration Date (Optional)</Label>
                <Input
                  id="expiration"
                  type="datetime-local"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  placeholder="Leave empty for no expiration"
                />
                <p className="text-sm text-muted-foreground">
                  Leave empty for a link that never expires (default: 30 days)
                </p>
              </div>

              <Button
                onClick={handleCreateShare}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Creating...' : 'Create Share Link'}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Share Link</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={shareInfo.shareUrl}
                    readOnly
                    className="flex-1 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(shareInfo.shareUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Views</p>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {shareInfo.viewCount}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Status</p>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatExpirationDate(shareInfo.expiresAt)}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {/* Social Media Sharing */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Share on Social Media</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareToSocial('facebook')}
                      className="justify-start"
                    >
                      <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                      Facebook
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareToSocial('twitter')}
                      className="justify-start"
                    >
                      <Twitter className="h-4 w-4 mr-2 text-sky-500" />
                      Twitter
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareToSocial('whatsapp')}
                      className="justify-start"
                    >
                      <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareToSocial('email')}
                      className="justify-start"
                    >
                      <Mail className="h-4 w-4 mr-2 text-gray-600" />
                      Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareToSocial('instagram')}
                      className="justify-start col-span-2"
                    >
                      <Instagram className="h-4 w-4 mr-2 text-pink-600" />
                      Copy for Instagram
                    </Button>
                  </div>
                </div>

                <Separator />
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openShareLink}
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Manage
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Share Options</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => copyToClipboard(shareInfo.shareUrl)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={openShareLink}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open in New Tab
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={revokeShare} 
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Revoke Access
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                <p><strong>Created:</strong> {format(new Date(shareInfo.createdAt), 'PPp')}</p>
                <p className="mt-1">Anyone with this link can view the meal plan without logging in.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareMealPlanButton;