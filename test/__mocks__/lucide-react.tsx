// test/__mocks__/lucide-react.tsx
import React from 'react';

// Create a generic icon component factory
const createMockIcon = (name: string) => {
  const MockIcon = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
    (props, ref) => (
      <svg
        ref={ref}
        data-testid={`${name}-icon`}
        {...props}
      />
    )
  );
  MockIcon.displayName = name;
  return MockIcon;
};

// Export all icons used in the app
export const ChefHat = createMockIcon('ChefHat');
export const Sparkles = createMockIcon('Sparkles');
export const Database = createMockIcon('Database');
export const Target = createMockIcon('Target');
export const Zap = createMockIcon('Zap');
export const Clock = createMockIcon('Clock');
export const ChevronUp = createMockIcon('ChevronUp');
export const ChevronDown = createMockIcon('ChevronDown');
export const Wand2 = createMockIcon('Wand2');
export const CheckCircle = createMockIcon('CheckCircle');
export const Circle = createMockIcon('Circle');
export const BarChart3 = createMockIcon('BarChart3'); // Add missing icon for Admin dashboard
export const Users = createMockIcon('Users');
export const FileText = createMockIcon('FileText');
export const Settings = createMockIcon('Settings');
export const Plus = createMockIcon('Plus');
export const Trash = createMockIcon('Trash');
export const Edit = createMockIcon('Edit');
export const Check = createMockIcon('Check');
export const X = createMockIcon('X');
export const Search = createMockIcon('Search');
export const Filter = createMockIcon('Filter');
export const Download = createMockIcon('Download');
export const Upload = createMockIcon('Upload');
export const Save = createMockIcon('Save');
export const Delete = createMockIcon('Delete');
export const Eye = createMockIcon('Eye');
export const EyeOff = createMockIcon('EyeOff');
export const ArrowLeft = createMockIcon('ArrowLeft');
export const ArrowRight = createMockIcon('ArrowRight');
export const Loader = createMockIcon('Loader');
export const Loader2 = createMockIcon('Loader2');
export const AlertCircle = createMockIcon('AlertCircle');
export const AlertTriangle = createMockIcon('AlertTriangle');
export const Info = createMockIcon('Info');
export const Menu = createMockIcon('Menu');
export const MoreVertical = createMockIcon('MoreVertical');
export const MoreHorizontal = createMockIcon('MoreHorizontal');
export const Calendar = createMockIcon('Calendar');
export const Heart = createMockIcon('Heart');
export const Star = createMockIcon('Star');
export const Home = createMockIcon('Home');
export const LogOut = createMockIcon('LogOut');
export const User = createMockIcon('User');
export const Bell = createMockIcon('Bell');
export const MessageSquare = createMockIcon('MessageSquare');
export const TrendingUp = createMockIcon('TrendingUp');
export const TrendingDown = createMockIcon('TrendingDown');
export const Activity = createMockIcon('Activity');
export const Package = createMockIcon('Package');
export const ShoppingCart = createMockIcon('ShoppingCart');
export const CreditCard = createMockIcon('CreditCard');
export const Mail = createMockIcon('Mail');
export const Phone = createMockIcon('Phone');
export const MapPin = createMockIcon('MapPin');
export const Globe = createMockIcon('Globe');
export const Link = createMockIcon('Link');
export const Copy = createMockIcon('Copy');
export const Share = createMockIcon('Share');
export const RefreshCw = createMockIcon('RefreshCw');
export const RotateCcw = createMockIcon('RotateCcw');
export const Maximize = createMockIcon('Maximize');
export const Minimize = createMockIcon('Minimize');
export const ZoomIn = createMockIcon('ZoomIn');
export const ZoomOut = createMockIcon('ZoomOut');
export const Play = createMockIcon('Play');
export const Pause = createMockIcon('Pause');
export const Stop = createMockIcon('Stop');
export const SkipBack = createMockIcon('SkipBack');
export const SkipForward = createMockIcon('SkipForward');
export const Volume = createMockIcon('Volume');
export const Volume2 = createMockIcon('Volume2');
export const VolumeX = createMockIcon('VolumeX');
// Customer profile icons
export const Scale = createMockIcon('Scale');
export const Ruler = createMockIcon('Ruler');
export const Dumbbell = createMockIcon('Dumbbell');
export const Weight = createMockIcon('Weight');
