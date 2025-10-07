import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/utils';
import { Loader2 } from 'lucide-react';

interface TouchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  hapticFeedback?: boolean;
}

const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      hapticFeedback = true,
      className,
      children,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Haptic feedback for mobile devices
      if (hapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }

      // Add ripple effect
      const button = e.currentTarget;
      const ripple = document.createElement('span');
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add('ripple-effect');

      button.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 600);

      if (onClick) {
        onClick(e);
      }
    };

    const variantClasses = {
      primary: 'bg-primary text-white hover:bg-primary/90 active:bg-primary/80',
      secondary: 'bg-secondary text-white hover:bg-secondary/90 active:bg-secondary/80',
      outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100',
      ghost: 'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
      danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
    };

    const sizeClasses = {
      sm: 'min-h-[36px] px-3 py-1.5 text-sm',
      md: 'min-h-[44px] px-4 py-2 text-base',
      lg: 'min-h-[52px] px-6 py-3 text-lg',
      xl: 'min-h-[60px] px-8 py-4 text-xl',
    };

    return (
      <button
        ref={ref}
        onClick={handleClick}
        disabled={disabled || loading}
        className={cn(
          // Base styles
          'relative overflow-hidden inline-flex items-center justify-center',
          'font-medium rounded-lg transition-all duration-200',
          'touch-manipulation select-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
          // Touch optimization
          'active:scale-[0.98]',
          // Variant styles
          variantClasses[variant],
          // Size styles
          sizeClasses[size],
          // Full width
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <Loader2 className="absolute animate-spin h-5 w-5" />
        )}

        {/* Content */}
        <span
          className={cn(
            'inline-flex items-center gap-2',
            loading && 'invisible'
          )}
        >
          {leftIcon && <span className="inline-flex">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="inline-flex">{rightIcon}</span>}
        </span>
      </button>
    );
  }
);

TouchButton.displayName = 'TouchButton';

export default TouchButton;