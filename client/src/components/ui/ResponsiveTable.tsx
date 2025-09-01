/**
 * ResponsiveTable Component
 * Story 1.8: Responsive UI/UX Enhancement
 * 
 * A wrapper component that automatically switches between table and card view
 * based on screen size, providing optimal viewing experience on all devices.
 */

import React, { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
  mobileView?: ReactNode;
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  children,
  className,
  mobileView,
  breakpoint = 'lg'
}) => {
  const breakpointClass = {
    sm: 'sm:block',
    md: 'md:block',
    lg: 'lg:block',
    xl: 'xl:block'
  }[breakpoint];

  // If custom mobile view is provided
  if (mobileView) {
    return (
      <>
        <div className={`block ${breakpointClass === 'sm:block' ? 'sm:hidden' : breakpointClass === 'md:block' ? 'md:hidden' : breakpointClass === 'lg:block' ? 'lg:hidden' : 'xl:hidden'}`}>
          {mobileView}
        </div>
        <div className={cn(
          `hidden ${breakpointClass}`,
          'overflow-x-auto rounded-lg border shadow-sm',
          className
        )}>
          {children}
        </div>
      </>
    );
  }

  // Default responsive table with horizontal scroll
  return (
    <div className={cn(
      'w-full overflow-x-auto rounded-lg border shadow-sm',
      '-mx-4 px-4 sm:mx-0 sm:px-0',
      className
    )}>
      <div className="min-w-full inline-block align-middle">
        {children}
      </div>
    </div>
  );
};

interface ResponsiveCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  className,
  onClick
}) => {
  return (
    <div
      className={cn(
        'mobile-card touch-feedback',
        'bg-white rounded-lg p-4 mb-3',
        'shadow-sm hover:shadow-md transition-all duration-200',
        'cursor-pointer active:scale-[0.98]',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface ResponsiveCardGridProps {
  children: ReactNode;
  className?: string;
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export const ResponsiveCardGrid: React.FC<ResponsiveCardGridProps> = ({
  children,
  className,
  columns = { default: 1, sm: 1, md: 2, lg: 3, xl: 4 }
}) => {
  const gridClasses = [
    columns.default ? `grid-cols-${columns.default}` : 'grid-cols-1',
    columns.sm ? `sm:grid-cols-${columns.sm}` : '',
    columns.md ? `md:grid-cols-${columns.md}` : '',
    columns.lg ? `lg:grid-cols-${columns.lg}` : '',
    columns.xl ? `xl:grid-cols-${columns.xl}` : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={cn('grid gap-4', gridClasses, className)}>
      {children}
    </div>
  );
};

interface TableToCardsProps {
  items: any[];
  renderCard: (item: any, index: number) => ReactNode;
  renderTable: () => ReactNode;
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  emptyMessage?: string;
}

export const TableToCards: React.FC<TableToCardsProps> = ({
  items,
  renderCard,
  renderTable,
  breakpoint = 'lg',
  className,
  emptyMessage = 'No items to display'
}) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  const mobileView = (
    <div className={cn('space-y-3', className)}>
      {items.map((item, index) => renderCard(item, index))}
    </div>
  );

  return (
    <ResponsiveTable
      mobileView={mobileView}
      breakpoint={breakpoint}
      className={className}
    >
      {renderTable()}
    </ResponsiveTable>
  );
};

interface MobileTableRowProps {
  label: string;
  value: ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export const MobileTableRow: React.FC<MobileTableRowProps> = ({
  label,
  value,
  className,
  labelClassName,
  valueClassName
}) => {
  return (
    <div className={cn('flex justify-between items-center py-2', className)}>
      <span className={cn('text-sm text-gray-600', labelClassName)}>
        {label}
      </span>
      <span className={cn('text-sm font-medium text-gray-900', valueClassName)}>
        {value}
      </span>
    </div>
  );
};

interface MobileTableSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export const MobileTableSection: React.FC<MobileTableSectionProps> = ({
  title,
  children,
  className
}) => {
  return (
    <div className={cn('space-y-1', className)}>
      {title && (
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
};

export default ResponsiveTable;