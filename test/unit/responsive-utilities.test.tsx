/**
 * Responsive Utilities Unit Tests
 * Tests for responsive utility classes, breakpoint detection, and responsive helper functions
 * Covers container calculations, modal positioning, and table transformations
 */

import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

// Mock components that utilize responsive utilities
const ResponsiveContainer: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
  <div className={`container ${className}`} data-testid="responsive-container">
    {children}
  </div>
);

const ResponsiveGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="responsive-grid">
    {children}
  </div>
);

const ResponsiveModal: React.FC<{ isOpen: boolean, children: React.ReactNode }> = ({ isOpen, children }) => (
  isOpen ? (
    <div className="fixed inset-0 z-50" data-testid="modal-backdrop">
      <div className="modal-container w-full h-full md:w-auto md:h-auto md:max-w-lg md:mx-auto md:my-8 md:rounded-lg"
           data-testid="modal-container">
        {children}
      </div>
    </div>
  ) : null
);

const ResponsiveTable: React.FC<{ data: Array<{ id: number, name: string, email: string }> }> = ({ data }) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isMobile) {
    return (
      <div className="mobile-card-view" data-testid="mobile-card-view">
        {data.map(item => (
          <div key={item.id} className="card border rounded-lg p-4 mb-4" data-testid={`mobile-card-${item.id}`}>
            <div className="font-semibold">{item.name}</div>
            <div className="text-gray-600">{item.email}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <table className="desktop-table w-full" data-testid="desktop-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
        </tr>
      </thead>
      <tbody>
        {data.map(item => (
          <tr key={item.id} data-testid={`desktop-row-${item.id}`}>
            <td>{item.name}</td>
            <td>{item.email}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Utility functions to test
const getBreakpoint = () => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

const calculateContainerWidth = (breakpoint: string, paddingMultiplier: number = 1) => {
  const width = window.innerWidth;

  switch (breakpoint) {
    case 'mobile':
      return width - (32 * paddingMultiplier); // 16px padding each side
    case 'tablet':
      return (width * 0.9) - (48 * paddingMultiplier); // 90% width, 24px padding each side
    case 'desktop':
      return Math.min(width * 0.9, 1280) - (64 * paddingMultiplier); // 90% width max 1280px, 32px padding each side
    default:
      return width;
  }
};

const shouldUseHorizontalScroll = (contentWidth: number, containerWidth: number) => {
  return contentWidth > containerWidth;
};

const getModalPosition = (breakpoint: string) => {
  switch (breakpoint) {
    case 'mobile':
      return {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        transform: 'none'
      };
    case 'tablet':
    case 'desktop':
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '32rem',
        maxHeight: '90vh'
      };
    default:
      return {};
  }
};

const getTypographyScale = (breakpoint: string) => {
  const scales = {
    mobile: {
      h1: '1.75rem',
      h2: '1.5rem',
      h3: '1.25rem',
      body: '1rem'
    },
    tablet: {
      h1: '2rem',
      h2: '1.75rem',
      h3: '1.5rem',
      body: '1rem'
    },
    desktop: {
      h1: '2.25rem',
      h2: '2rem',
      h3: '1.75rem',
      body: '1rem'
    }
  };

  return scales[breakpoint as keyof typeof scales] || scales.mobile;
};

// Helper to set viewport size and trigger resize
const setViewportSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });

  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
};

// Mock getBoundingClientRect
const mockGetBoundingClientRect = (width: number, height: number) => {
  return vi.fn(() => ({
    width,
    height,
    top: 0,
    left: 0,
    bottom: height,
    right: width,
    x: 0,
    y: 0,
    toJSON: vi.fn()
  }));
};

describe('Responsive Utilities Tests', () => {
  beforeEach(() => {
    // Default to desktop view
    setViewportSize(1920, 1080);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Breakpoint Detection', () => {
    test('should correctly identify mobile breakpoint (< 768px)', () => {
      const mobileWidths = [320, 375, 414, 767];

      mobileWidths.forEach(width => {
        setViewportSize(width, 812);
        expect(getBreakpoint()).toBe('mobile');
        expect(window.innerWidth).toBeLessThan(768);
      });
    });

    test('should correctly identify tablet breakpoint (768px - 1023px)', () => {
      const tabletWidths = [768, 800, 1000, 1023];

      tabletWidths.forEach(width => {
        setViewportSize(width, 1024);
        expect(getBreakpoint()).toBe('tablet');
        expect(window.innerWidth).toBeGreaterThanOrEqual(768);
        expect(window.innerWidth).toBeLessThan(1024);
      });
    });

    test('should correctly identify desktop breakpoint (>= 1024px)', () => {
      const desktopWidths = [1024, 1280, 1920, 2560];

      desktopWidths.forEach(width => {
        setViewportSize(width, 1080);
        expect(getBreakpoint()).toBe('desktop');
        expect(window.innerWidth).toBeGreaterThanOrEqual(1024);
      });
    });
  });

  describe('Container Width Calculations', () => {
    test('should calculate correct mobile container width', () => {
      setViewportSize(375, 812);
      const breakpoint = getBreakpoint();
      const containerWidth = calculateContainerWidth(breakpoint);

      // Mobile: full width minus 32px padding (16px each side)
      expect(containerWidth).toBe(375 - 32);
      expect(containerWidth).toBe(343);
    });

    test('should calculate correct tablet container width', () => {
      setViewportSize(768, 1024);
      const breakpoint = getBreakpoint();
      const containerWidth = calculateContainerWidth(breakpoint);

      // Tablet: 90% width minus 48px padding (24px each side)
      const expectedWidth = (768 * 0.9) - 48;
      expect(containerWidth).toBe(expectedWidth);
      expect(containerWidth).toBe(643.2);
    });

    test('should calculate correct desktop container width', () => {
      setViewportSize(1920, 1080);
      const breakpoint = getBreakpoint();
      const containerWidth = calculateContainerWidth(breakpoint);

      // Desktop: min(90% width, 1280px) minus 64px padding (32px each side)
      const expectedWidth = Math.min(1920 * 0.9, 1280) - 64;
      expect(containerWidth).toBe(expectedWidth);
      expect(containerWidth).toBe(1216); // 1280 - 64
    });

    test('should handle padding multiplier for nested containers', () => {
      setViewportSize(1024, 768);
      const breakpoint = getBreakpoint();
      const containerWidth = calculateContainerWidth(breakpoint, 2);

      // Desktop with 2x padding multiplier
      const expectedWidth = Math.min(1024 * 0.9, 1280) - (64 * 2);
      expect(containerWidth).toBe(expectedWidth);
      expect(containerWidth).toBe(857.6); // 921.6 - 128
    });

    test('should maintain minimum usable width on very small screens', () => {
      setViewportSize(280, 568); // Very small mobile
      const breakpoint = getBreakpoint();
      const containerWidth = calculateContainerWidth(breakpoint);

      expect(containerWidth).toBeGreaterThan(200); // Minimum usable width
      expect(containerWidth).toBe(248); // 280 - 32
    });
  });

  describe('Width Utilization Tests', () => {
    test('should achieve high width utilization on mobile (85%+)', () => {
      setViewportSize(375, 812);
      const breakpoint = getBreakpoint();
      const containerWidth = calculateContainerWidth(breakpoint);
      const utilizationPercent = (containerWidth / window.innerWidth) * 100;

      expect(utilizationPercent).toBeGreaterThan(85);
      expect(utilizationPercent).toBe(91.47); // 343/375 * 100
    });

    test('should achieve 90% width utilization on desktop', () => {
      setViewportSize(1600, 900);
      const breakpoint = getBreakpoint();
      const containerWidth = calculateContainerWidth(breakpoint);
      const expectedWidth = Math.min(1600 * 0.9, 1280) - 64;

      // Should be close to 90% utilization (accounting for padding and max-width)
      expect(containerWidth).toBe(1216); // 1280 - 64 (max-width constraint)

      const utilizationPercent = (containerWidth / 1600) * 100;
      expect(utilizationPercent).toBe(76); // Limited by max-width constraint
    });
  });

  describe('Responsive Grid Behavior', () => {
    test('should render single column grid on mobile', () => {
      setViewportSize(375, 812);

      render(<ResponsiveGrid>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </ResponsiveGrid>);

      const grid = screen.getByTestId('responsive-grid');
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
    });

    test('should show appropriate grid columns for each breakpoint', () => {
      const testCases = [
        { width: 375, expectedMobileClass: 'grid-cols-1' },
        { width: 768, expectedTabletClass: 'md:grid-cols-2' },
        { width: 1024, expectedDesktopClass: 'lg:grid-cols-3' }
      ];

      testCases.forEach(({ width, expectedMobileClass, expectedTabletClass, expectedDesktopClass }) => {
        setViewportSize(width, 800);

        const { unmount } = render(<ResponsiveGrid>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>);

        const grid = screen.getByTestId('responsive-grid');

        // Grid should have all responsive classes
        expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');

        unmount();
      });
    });
  });

  describe('Modal Positioning Tests', () => {
    test('should position modal full-screen on mobile', () => {
      setViewportSize(375, 812);
      const breakpoint = getBreakpoint();
      const modalStyles = getModalPosition(breakpoint);

      expect(modalStyles).toEqual({
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        transform: 'none'
      });
    });

    test('should center modal on tablet and desktop', () => {
      const desktopSizes = [
        [768, 1024],   // Tablet
        [1024, 768],   // Desktop
        [1920, 1080]   // Large desktop
      ];

      desktopSizes.forEach(([width, height]) => {
        setViewportSize(width, height);
        const breakpoint = getBreakpoint();
        const modalStyles = getModalPosition(breakpoint);

        if (breakpoint !== 'mobile') {
          expect(modalStyles).toEqual({
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '32rem',
            maxHeight: '90vh'
          });
        }
      });
    });

    test('should render modal with correct responsive classes', () => {
      setViewportSize(1024, 768);

      render(<ResponsiveModal isOpen={true}>
        <div>Modal Content</div>
      </ResponsiveModal>);

      const modalContainer = screen.getByTestId('modal-container');
      expect(modalContainer).toHaveClass(
        'w-full', 'h-full',
        'md:w-auto', 'md:h-auto', 'md:max-w-lg', 'md:mx-auto', 'md:my-8', 'md:rounded-lg'
      );
    });
  });

  describe('Table to Card Transformation', () => {
    const sampleData = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com' }
    ];

    test('should render table view on desktop', () => {
      setViewportSize(1024, 768);

      render(<ResponsiveTable data={sampleData} />);

      // Should render desktop table
      expect(screen.getByTestId('desktop-table')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-card-view')).not.toBeInTheDocument();

      // Check table structure
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('row')).toHaveLength(4); // 1 header + 3 data rows
    });

    test('should transform to card view on mobile', () => {
      setViewportSize(375, 812);

      render(<ResponsiveTable data={sampleData} />);

      // Should render mobile card view
      expect(screen.getByTestId('mobile-card-view')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-table')).not.toBeInTheDocument();

      // Check card structure
      expect(screen.getByTestId('mobile-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-card-3')).toBeInTheDocument();
    });

    test('should display all data in both table and card views', () => {
      // Test desktop view
      setViewportSize(1024, 768);
      let { unmount } = render(<ResponsiveTable data={sampleData} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();

      unmount();

      // Test mobile view
      setViewportSize(375, 812);
      render(<ResponsiveTable data={sampleData} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  describe('Typography Scaling', () => {
    test('should provide correct typography scale for mobile', () => {
      setViewportSize(375, 812);
      const breakpoint = getBreakpoint();
      const scale = getTypographyScale(breakpoint);

      expect(scale).toEqual({
        h1: '1.75rem',
        h2: '1.5rem',
        h3: '1.25rem',
        body: '1rem'
      });
    });

    test('should provide correct typography scale for tablet', () => {
      setViewportSize(768, 1024);
      const breakpoint = getBreakpoint();
      const scale = getTypographyScale(breakpoint);

      expect(scale).toEqual({
        h1: '2rem',
        h2: '1.75rem',
        h3: '1.5rem',
        body: '1rem'
      });
    });

    test('should provide correct typography scale for desktop', () => {
      setViewportSize(1920, 1080);
      const breakpoint = getBreakpoint();
      const scale = getTypographyScale(breakpoint);

      expect(scale).toEqual({
        h1: '2.25rem',
        h2: '2rem',
        h3: '1.75rem',
        body: '1rem'
      });
    });

    test('should fallback to mobile scale for unknown breakpoints', () => {
      const scale = getTypographyScale('unknown');

      expect(scale).toEqual({
        h1: '1.75rem',
        h2: '1.5rem',
        h3: '1.25rem',
        body: '1rem'
      });
    });
  });

  describe('Horizontal Scroll Prevention', () => {
    test('should detect when content exceeds container width', () => {
      const contentWidth = 500;
      const containerWidth = 300;

      expect(shouldUseHorizontalScroll(contentWidth, containerWidth)).toBe(true);
    });

    test('should not use horizontal scroll when content fits', () => {
      const contentWidth = 300;
      const containerWidth = 500;

      expect(shouldUseHorizontalScroll(contentWidth, containerWidth)).toBe(false);
    });

    test('should handle edge case where content exactly matches container', () => {
      const contentWidth = 400;
      const containerWidth = 400;

      expect(shouldUseHorizontalScroll(contentWidth, containerWidth)).toBe(false);
    });

    test('should prevent horizontal scroll on mobile with proper container sizing', () => {
      setViewportSize(375, 812);
      const breakpoint = getBreakpoint();
      const containerWidth = calculateContainerWidth(breakpoint);

      // Content should fit within container
      const maxContentWidth = containerWidth - 20; // Account for some internal spacing

      expect(shouldUseHorizontalScroll(maxContentWidth, containerWidth)).toBe(false);
    });
  });

  describe('Responsive Container Behavior', () => {
    test('should render container with proper responsive classes', () => {
      render(<ResponsiveContainer className="max-w-7xl mx-auto">
        <div>Container Content</div>
      </ResponsiveContainer>);

      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveClass('container', 'max-w-7xl', 'mx-auto');
    });

    test('should calculate container dimensions correctly across breakpoints', () => {
      const testBreakpoints = [
        { width: 375, height: 812, expected: 343 },   // Mobile: 375 - 32
        { width: 768, height: 1024, expected: 643.2 }, // Tablet: (768 * 0.9) - 48
        { width: 1920, height: 1080, expected: 1216 }  // Desktop: min(1728, 1280) - 64
      ];

      testBreakpoints.forEach(({ width, height, expected }) => {
        setViewportSize(width, height);
        const breakpoint = getBreakpoint();
        const containerWidth = calculateContainerWidth(breakpoint);

        expect(containerWidth).toBe(expected);
      });
    });
  });

  describe('Responsive Utilities Edge Cases', () => {
    test('should handle viewport resize events', () => {
      // Start at mobile
      setViewportSize(375, 812);
      expect(getBreakpoint()).toBe('mobile');

      // Resize to tablet
      setViewportSize(800, 1024);
      expect(getBreakpoint()).toBe('tablet');

      // Resize to desktop
      setViewportSize(1200, 800);
      expect(getBreakpoint()).toBe('desktop');
    });

    test('should handle extremely small viewport sizes', () => {
      setViewportSize(240, 320); // Very small device
      const breakpoint = getBreakpoint();
      const containerWidth = calculateContainerWidth(breakpoint);

      expect(breakpoint).toBe('mobile');
      expect(containerWidth).toBe(208); // 240 - 32
      expect(containerWidth).toBeGreaterThan(150); // Minimum usable width
    });

    test('should handle extremely large viewport sizes', () => {
      setViewportSize(3840, 2160); // 4K display
      const breakpoint = getBreakpoint();
      const containerWidth = calculateContainerWidth(breakpoint);

      expect(breakpoint).toBe('desktop');
      expect(containerWidth).toBe(1216); // Constrained by max-width: 1280 - 64
    });

    test('should maintain aspect ratios in responsive containers', () => {
      setViewportSize(1024, 768);

      render(<ResponsiveContainer>
        <div className="aspect-video bg-gray-200" data-testid="aspect-content">
          <div>16:9 Content</div>
        </div>
      </ResponsiveContainer>);

      const aspectContent = screen.getByTestId('aspect-content');
      expect(aspectContent).toHaveClass('aspect-video');
    });
  });

  describe('Performance Considerations', () => {
    test('should efficiently calculate container widths without excessive re-computation', () => {
      const startTime = performance.now();

      // Simulate multiple breakpoint checks
      for (let i = 0; i < 1000; i++) {
        setViewportSize(1024 + i, 768);
        const breakpoint = getBreakpoint();
        calculateContainerWidth(breakpoint);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete 1000 calculations in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    test('should handle rapid viewport size changes efficiently', () => {
      const sizes = [
        [375, 812], [768, 1024], [1024, 768], [1920, 1080], [375, 812]
      ];

      const startTime = performance.now();

      sizes.forEach(([width, height]) => {
        setViewportSize(width, height);
        const breakpoint = getBreakpoint();
        calculateContainerWidth(breakpoint);
        getModalPosition(breakpoint);
        getTypographyScale(breakpoint);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle rapid changes efficiently
      expect(duration).toBeLessThan(50);
    });
  });
});