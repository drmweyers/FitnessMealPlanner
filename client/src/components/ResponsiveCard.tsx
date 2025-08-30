import React, { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { ChevronRight } from 'lucide-react';

interface ResponsiveCardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  headerAction?: ReactNode;
  footer?: ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  title,
  subtitle,
  children,
  onClick,
  className,
  headerAction,
  footer,
  variant = 'default',
  padding = 'md',
  interactive = false,
}) => {
  const variantClasses = {
    default: 'bg-white border border-gray-200',
    outlined: 'bg-transparent border-2 border-gray-300',
    elevated: 'bg-white shadow-lg',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={cn(
        // Base styles
        'block w-full rounded-lg transition-all duration-200',
        variantClasses[variant],
        // Interactive styles
        interactive && 'cursor-pointer hover:shadow-md active:scale-[0.99]',
        onClick && 'touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        // Mobile optimization
        'mobile-card',
        className
      )}
    >
      {/* Header */}
      {(title || subtitle || headerAction) && (
        <div className={cn(
          'flex items-start justify-between',
          padding !== 'none' && paddingClasses[padding],
          children && 'border-b border-gray-100'
        )}>
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && (
            <div className="ml-4 flex-shrink-0">
              {headerAction}
            </div>
          )}
          {onClick && (
            <ChevronRight className="ml-2 w-5 h-5 text-gray-400 flex-shrink-0" />
          )}
        </div>
      )}

      {/* Content */}
      {children && (
        <div className={cn(
          padding !== 'none' && paddingClasses[padding],
          (title || subtitle || headerAction) && padding === 'none' && 'pt-0'
        )}>
          {children}
        </div>
      )}

      {/* Footer */}
      {footer && (
        <div className={cn(
          'border-t border-gray-100',
          padding !== 'none' && paddingClasses[padding]
        )}>
          {footer}
        </div>
      )}
    </Component>
  );
};

export default ResponsiveCard;