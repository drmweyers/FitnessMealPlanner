import React, { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  showCloseButton?: boolean;
  preventClose?: boolean;
}

const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className,
  showCloseButton = true,
  preventClose = false,
}) => {
  // Handle escape key
  useEffect(() => {
    if (!isOpen || preventClose) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, preventClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-0',
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (!preventClose && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        className={cn(
          // Base styles
          'relative bg-white w-full transform transition-all duration-300',
          // Mobile styles (slide up from bottom)
          'rounded-t-2xl sm:rounded-2xl',
          'max-h-[90vh] sm:max-h-[85vh]',
          'animate-in slide-in-from-bottom sm:zoom-in-95',
          // Desktop styles
          'sm:mx-4',
          sizeClasses[size],
          // Safe area for mobile
          'pb-safe',
          className
        )}
      >
        {/* Mobile drag indicator */}
        <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-300 rounded-full" />

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="sticky top-0 bg-white rounded-t-2xl sm:rounded-t-xl border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 pr-2">
              {title}
            </h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="touch-target touch-feedback rounded-full p-2 hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveModal;