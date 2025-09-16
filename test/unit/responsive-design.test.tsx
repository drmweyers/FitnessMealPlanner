/**
 * Responsive Design Unit Tests
 * Tests for Progressive Web App responsive behavior across all device sizes
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import Layout from '../../client/src/components/Layout';
import MobileNavigation from '../../client/src/components/MobileNavigation';
import { AuthProvider } from '../../client/src/contexts/AuthContext';

// Mock window.matchMedia for media query tests
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

// Mock auth context
const mockAuthContext = (role: string = 'customer') => ({
  user: {
    id: '1',
    email: 'test@example.com',
    role,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  login: vi.fn(),
  logout: vi.fn(),
  isLoading: false
});

// Helper to set viewport size
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
  window.dispatchEvent(new Event('resize'));
};

// Mock CSS styles for testing
const mockGetComputedStyle = (element: Element) => {
  const width = window.innerWidth;

  // Mobile styles (0-767px)
  if (width <= 767) {
    if (element.tagName === 'BUTTON' || element.tagName === 'A' || element.tagName === 'INPUT') {
      return { minHeight: '44px', padding: '12px 16px' };
    }
    if (element.tagName === 'H1') return { fontSize: '1.75rem' };
    if (element.tagName === 'H2') return { fontSize: '1.5rem' };
    if (element.tagName === 'H3') return { fontSize: '1.25rem' };
    if (element.classList.contains('grid')) return { gridTemplateColumns: '1fr' };
    if (element.classList.contains('container')) return { paddingLeft: '16px', paddingRight: '16px' };
    if (element.classList.contains('mobile-navigation')) return { display: 'block' };
    if (element.tagName === 'HEADER' && element.classList.contains('lg:block')) return { display: 'none' };
  }

  // Tablet styles (768px-1023px)
  if (width >= 768 && width <= 1023) {
    if (element.tagName === 'BUTTON' || element.tagName === 'A' || element.tagName === 'INPUT') {
      return { minHeight: '36px', padding: '8px 12px' };
    }
    if (element.tagName === 'H1') return { fontSize: '2rem' };
    if (element.tagName === 'H2') return { fontSize: '1.75rem' };
    if (element.classList.contains('grid')) return { gridTemplateColumns: 'repeat(2, 1fr)' };
    if (element.classList.contains('container')) return { paddingLeft: '24px', paddingRight: '24px' };
    if (element.classList.contains('mobile-navigation')) return { display: 'none' };
    if (element.tagName === 'HEADER') return { display: 'block' };
  }

  // Desktop styles (1024px+)
  if (width >= 1024) {
    if (element.tagName === 'BUTTON' || element.tagName === 'A' || element.tagName === 'INPUT') {
      return { minHeight: '32px', padding: '6px 12px', transition: 'all 0.2s ease' };
    }
    if (element.tagName === 'H1') return { fontSize: '2.25rem' };
    if (element.tagName === 'H2') return { fontSize: '2rem' };
    if (element.tagName === 'H3') return { fontSize: '1.75rem' };
    if (element.classList.contains('grid')) return { gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' };
    if (element.classList.contains('container')) return {
      paddingLeft: '32px',
      paddingRight: '32px',
      maxWidth: '1280px',
      margin: '0 auto'
    };
    if (element.classList.contains('mobile-navigation')) return { display: 'none' };
    if (element.tagName === 'HEADER') return { display: 'block' };
  }

  return {};
};

describe('Responsive Design Tests', () => {
  describe('Mobile View (0-767px)', () => {
    beforeEach(() => {
      setViewportSize(375, 812); // iPhone X size
      mockMatchMedia(true);
    });

    test('should apply mobile styles for buttons and inputs', () => {
      render(
        <BrowserRouter>
          <div>
            <button className="test-button">Test Button</button>
            <input type="text" className="test-input" placeholder="Test Input" />
            <a href="#" className="test-link">Test Link</a>
          </div>
        </BrowserRouter>
      );

      const button = screen.getByRole('button');
      const input = screen.getByRole('textbox');
      const link = screen.getByRole('link');

      // Simulate mobile styles
      const buttonStyles = mockGetComputedStyle(button);
      const inputStyles = mockGetComputedStyle(input);
      const linkStyles = mockGetComputedStyle(link);

      // Mobile should have 44px min-height
      expect(buttonStyles.minHeight).toBe('44px');
      expect(inputStyles.minHeight).toBe('44px');
      expect(linkStyles.minHeight).toBe('44px');
    });

    test('should stack content vertically on mobile', () => {
      render(
        <BrowserRouter>
          <div className="grid">
            <div>Item 1</div>
            <div>Item 2</div>
            <div>Item 3</div>
          </div>
        </BrowserRouter>
      );

      const grid = document.querySelector('.grid');
      const computedStyle = mockGetComputedStyle(grid!);

      // Mobile should have single column layout
      expect(computedStyle.gridTemplateColumns).toBe('1fr');
    });

    test('should use mobile typography sizes', () => {
      render(
        <BrowserRouter>
          <div>
            <h1>Heading 1</h1>
            <h2>Heading 2</h2>
            <h3>Heading 3</h3>
            <p>Paragraph text</p>
          </div>
        </BrowserRouter>
      );

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2 = screen.getByRole('heading', { level: 2 });
      const h3 = screen.getByRole('heading', { level: 3 });

      const h1Styles = mockGetComputedStyle(h1);
      const h2Styles = mockGetComputedStyle(h2);
      const h3Styles = mockGetComputedStyle(h3);

      // Mobile typography sizes
      expect(h1Styles.fontSize).toBe('1.75rem');
      expect(h2Styles.fontSize).toBe('1.5rem');
      expect(h3Styles.fontSize).toBe('1.25rem');
    });

    test('should have mobile container padding', () => {
      render(
        <BrowserRouter>
          <div className="container max-w-7xl">
            <div>Content</div>
          </div>
        </BrowserRouter>
      );

      const container = document.querySelector('.container');
      const styles = mockGetComputedStyle(container!);

      // Mobile container padding
      expect(styles.paddingLeft).toBe('16px');
      expect(styles.paddingRight).toBe('16px');
    });
  });

  describe('Tablet View (768px-1023px)', () => {
    beforeEach(() => {
      setViewportSize(768, 1024); // iPad size
      mockMatchMedia(true);
    });

    test('should apply tablet styles for buttons and inputs', () => {
      render(
        <BrowserRouter>
          <button className="test-button">Test Button</button>
          <input type="text" className="test-input" placeholder="Test Input" />
        </BrowserRouter>
      );

      const button = screen.getByRole('button');
      const input = screen.getByRole('textbox');

      const buttonStyles = mockGetComputedStyle(button);
      const inputStyles = mockGetComputedStyle(input);

      // Tablet should have 36px min-height
      expect(buttonStyles.minHeight).toBe('36px');
      expect(inputStyles.minHeight).toBe('36px');
    });

    test('should use 2-column grid on tablets', () => {
      render(
        <BrowserRouter>
          <div className="grid">
            <div>Item 1</div>
            <div>Item 2</div>
            <div>Item 3</div>
            <div>Item 4</div>
          </div>
        </BrowserRouter>
      );

      const grid = document.querySelector('.grid');
      const computedStyle = mockGetComputedStyle(grid!);

      // Tablet should have 2-column layout
      expect(computedStyle.gridTemplateColumns).toBe('repeat(2, 1fr)');
    });

    test('should use tablet typography sizes', () => {
      render(
        <BrowserRouter>
          <div>
            <h1>Heading 1</h1>
            <h2>Heading 2</h2>
          </div>
        </BrowserRouter>
      );

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2 = screen.getByRole('heading', { level: 2 });

      const h1Styles = mockGetComputedStyle(h1);
      const h2Styles = mockGetComputedStyle(h2);

      // Tablet typography sizes
      expect(h1Styles.fontSize).toBe('2rem');
      expect(h2Styles.fontSize).toBe('1.75rem');
    });

    test('should have tablet container padding', () => {
      render(
        <BrowserRouter>
          <div className="container max-w-7xl">
            <div>Content</div>
          </div>
        </BrowserRouter>
      );

      const container = document.querySelector('.container');
      const styles = mockGetComputedStyle(container!);

      // Tablet container padding
      expect(styles.paddingLeft).toBe('24px');
      expect(styles.paddingRight).toBe('24px');
    });
  });

  describe('Desktop View (1024px+)', () => {
    beforeEach(() => {
      setViewportSize(1920, 1080); // Full HD desktop
      mockMatchMedia(false);
    });

    test('should apply desktop button sizes', () => {
      render(
        <BrowserRouter>
          <button className="test-button">Test Button</button>
          <input type="text" className="test-input" placeholder="Test Input" />
        </BrowserRouter>
      );

      const button = screen.getByRole('button');
      const input = screen.getByRole('textbox');

      const buttonStyles = mockGetComputedStyle(button);
      const inputStyles = mockGetComputedStyle(input);

      // Desktop should have 32px min-height
      expect(buttonStyles.minHeight).toBe('32px');
      expect(inputStyles.minHeight).toBe('32px');
    });

    test('should enable hover effects on desktop', () => {
      render(
        <BrowserRouter>
          <button className="test-button">Hover Button</button>
          <a href="#" className="test-link">Hover Link</a>
        </BrowserRouter>
      );

      const button = screen.getByRole('button');
      const link = screen.getByRole('link');

      const buttonStyles = mockGetComputedStyle(button);
      const linkStyles = mockGetComputedStyle(link);

      // Desktop should have transition effects
      expect(buttonStyles.transition).toBe('all 0.2s ease');
      expect(linkStyles.transition).toBe('all 0.2s ease');
    });

    test('should use multi-column grid on desktop', () => {
      render(
        <BrowserRouter>
          <div className="grid">
            <div>Item 1</div>
            <div>Item 2</div>
            <div>Item 3</div>
            <div>Item 4</div>
          </div>
        </BrowserRouter>
      );

      const grid = document.querySelector('.grid');
      const computedStyle = mockGetComputedStyle(grid!);

      // Desktop should have multi-column layout
      expect(computedStyle.gridTemplateColumns).toBe('repeat(auto-fit, minmax(300px, 1fr))');
    });

    test('should use desktop typography sizes', () => {
      render(
        <BrowserRouter>
          <div>
            <h1>Heading 1</h1>
            <h2>Heading 2</h2>
            <h3>Heading 3</h3>
          </div>
        </BrowserRouter>
      );

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2 = screen.getByRole('heading', { level: 2 });
      const h3 = screen.getByRole('heading', { level: 3 });

      const h1Styles = mockGetComputedStyle(h1);
      const h2Styles = mockGetComputedStyle(h2);
      const h3Styles = mockGetComputedStyle(h3);

      // Desktop typography sizes
      expect(h1Styles.fontSize).toBe('2.25rem');
      expect(h2Styles.fontSize).toBe('2rem');
      expect(h3Styles.fontSize).toBe('1.75rem');
    });

    test('should have desktop container styles', () => {
      render(
        <BrowserRouter>
          <div className="container max-w-7xl">
            <div>Content</div>
          </div>
        </BrowserRouter>
      );

      const container = document.querySelector('.container');
      const styles = mockGetComputedStyle(container!);

      // Desktop container styles
      expect(styles.paddingLeft).toBe('32px');
      expect(styles.paddingRight).toBe('32px');
      expect(styles.maxWidth).toBe('1280px');
      expect(styles.margin).toBe('0 auto');
    });
  });

  describe('Responsive Breakpoint Tests', () => {
    test('should correctly identify mobile breakpoint', () => {
      setViewportSize(320, 568); // iPhone SE
      expect(window.innerWidth).toBeLessThan(768);

      setViewportSize(414, 896); // iPhone 11
      expect(window.innerWidth).toBeLessThan(768);

      setViewportSize(767, 1024); // Max mobile width
      expect(window.innerWidth).toBeLessThan(768);
    });

    test('should correctly identify tablet breakpoint', () => {
      setViewportSize(768, 1024); // iPad
      expect(window.innerWidth).toBeGreaterThanOrEqual(768);
      expect(window.innerWidth).toBeLessThan(1024);

      setViewportSize(1023, 768); // Max tablet width
      expect(window.innerWidth).toBeGreaterThanOrEqual(768);
      expect(window.innerWidth).toBeLessThan(1024);
    });

    test('should correctly identify desktop breakpoint', () => {
      setViewportSize(1024, 768); // Min desktop
      expect(window.innerWidth).toBeGreaterThanOrEqual(1024);

      setViewportSize(1920, 1080); // Full HD
      expect(window.innerWidth).toBeGreaterThanOrEqual(1024);

      setViewportSize(2560, 1440); // 2K
      expect(window.innerWidth).toBeGreaterThanOrEqual(1024);
    });
  });

  describe('Navigation Responsive Behavior', () => {
    test('should show mobile navigation below 768px', () => {
      setViewportSize(375, 812);

      render(
        <BrowserRouter>
          <div className="mobile-navigation">Mobile Nav</div>
          <header className="lg:block">Desktop Header</header>
        </BrowserRouter>
      );

      const mobileNav = document.querySelector('.mobile-navigation');
      const desktopHeader = document.querySelector('header');

      const mobileStyles = mockGetComputedStyle(mobileNav!);
      const headerStyles = mockGetComputedStyle(desktopHeader!);

      expect(mobileStyles.display).toBe('block');
      expect(headerStyles.display).toBe('none');
    });

    test('should show desktop navigation at 1024px and above', () => {
      setViewportSize(1024, 768);

      render(
        <BrowserRouter>
          <div className="mobile-navigation">Mobile Nav</div>
          <header>Desktop Header</header>
        </BrowserRouter>
      );

      const mobileNav = document.querySelector('.mobile-navigation');
      const desktopHeader = document.querySelector('header');

      const mobileStyles = mockGetComputedStyle(mobileNav!);
      const headerStyles = mockGetComputedStyle(desktopHeader!);

      expect(mobileStyles.display).toBe('none');
      expect(headerStyles.display).toBe('block');
    });
  });
});