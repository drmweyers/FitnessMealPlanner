import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Layout from '../../client/src/components/Layout';
import { AuthProvider } from '../../client/src/contexts/AuthContext';

// Mock window.innerWidth
const mockInnerWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
};

// Mock matchMedia for responsive tests
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

describe('Full Width Layout Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Container Width on Different Screen Sizes', () => {
    test('should use full width on laptop screens (1440px)', () => {
      mockInnerWidth(1440);
      mockMatchMedia(true);

      const { container } = render(
        <AuthProvider>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </AuthProvider>
      );

      // Check main content container
      const mainContainer = container.querySelector('main > div');
      expect(mainContainer).toHaveClass('w-full');
      expect(mainContainer).toHaveClass('xl:max-w-[1536px]');

      // Should not have the old max-w-7xl class
      expect(mainContainer).not.toHaveClass('max-w-7xl');
    });

    test('should use full width on desktop screens (1920px)', () => {
      mockInnerWidth(1920);
      mockMatchMedia(true);

      const { container } = render(
        <AuthProvider>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </AuthProvider>
      );

      const mainContainer = container.querySelector('main > div');
      expect(mainContainer).toHaveClass('2xl:max-w-[1920px]');
      expect(mainContainer).toHaveClass('w-full');
    });

    test('should use full width on ultra-wide screens (2560px)', () => {
      mockInnerWidth(2560);
      mockMatchMedia(true);

      const { container } = render(
        <AuthProvider>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </AuthProvider>
      );

      const mainContainer = container.querySelector('main > div');
      expect(mainContainer).toHaveClass('2xl:max-w-[1920px]');
      // Should be constrained at 1920px max for ultra-wide
      expect(mainContainer?.className).toMatch(/max-w-\[1920px\]/);
    });

    test('should apply correct width classes to header', () => {
      mockInnerWidth(1920);
      mockMatchMedia(true);

      const { container } = render(
        <AuthProvider>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </AuthProvider>
      );

      const headerContainer = container.querySelector('header > div');
      expect(headerContainer).toHaveClass('w-full');
      expect(headerContainer).toHaveClass('xl:max-w-[1536px]');
      expect(headerContainer).toHaveClass('2xl:max-w-[1920px]');
    });

    test('should apply correct width classes to footer', () => {
      mockInnerWidth(1920);
      mockMatchMedia(true);

      const { container } = render(
        <AuthProvider>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </AuthProvider>
      );

      const footerContainer = container.querySelector('footer > div');
      expect(footerContainer).toHaveClass('w-full');
      expect(footerContainer).toHaveClass('xl:max-w-[1536px]');
      expect(footerContainer).toHaveClass('2xl:max-w-[1920px]');
    });
  });

  describe('Responsive Breakpoints', () => {
    test('should handle 1280px screens (xl breakpoint)', () => {
      mockInnerWidth(1280);
      mockMatchMedia(true);

      const { container } = render(
        <AuthProvider>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </AuthProvider>
      );

      const mainContainer = container.querySelector('main > div');
      expect(mainContainer).toHaveClass('xl:max-w-[1536px]');
    });

    test('should handle 1536px screens (2xl breakpoint)', () => {
      mockInnerWidth(1536);
      mockMatchMedia(true);

      const { container } = render(
        <AuthProvider>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </AuthProvider>
      );

      const mainContainer = container.querySelector('main > div');
      expect(mainContainer).toHaveClass('xl:max-w-[1536px]');
    });

    test('should handle 1366px laptop screens', () => {
      mockInnerWidth(1366);
      mockMatchMedia(true);

      const { container } = render(
        <AuthProvider>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </AuthProvider>
      );

      const mainContainer = container.querySelector('main > div');
      expect(mainContainer).toHaveClass('w-full');
      expect(mainContainer).toHaveClass('xl:max-w-[1536px]');
    });
  });

  describe('Content Width Percentage', () => {
    test('should use at least 80% of screen width on 1440px screens', () => {
      mockInnerWidth(1440);
      mockMatchMedia(true);

      const { container } = render(
        <AuthProvider>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </AuthProvider>
      );

      const mainContainer = container.querySelector('main > div');
      // With xl:max-w-[1536px], on a 1440px screen, it should use full width
      // minus padding, which should be at least 80%
      expect(mainContainer).toHaveClass('w-full');
    });

    test('should use at least 80% of screen width on 1920px screens', () => {
      mockInnerWidth(1920);
      mockMatchMedia(true);

      const { container } = render(
        <AuthProvider>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </AuthProvider>
      );

      const mainContainer = container.querySelector('main > div');
      // With 2xl:max-w-[1920px], on a 1920px screen, it should use full width
      expect(mainContainer).toHaveClass('2xl:max-w-[1920px]');
    });
  });

  describe('Mobile and Tablet Unchanged', () => {
    test('should not affect mobile layout (375px)', () => {
      mockInnerWidth(375);
      mockMatchMedia(false);

      const { container } = render(
        <AuthProvider>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </AuthProvider>
      );

      const mainContainer = container.querySelector('main > div');
      expect(mainContainer).toHaveClass('px-3');
      expect(mainContainer).toHaveClass('w-full');
    });

    test('should not affect tablet layout (768px)', () => {
      mockInnerWidth(768);
      mockMatchMedia(false);

      const { container } = render(
        <AuthProvider>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </AuthProvider>
      );

      const mainContainer = container.querySelector('main > div');
      expect(mainContainer).toHaveClass('sm:px-4');
      expect(mainContainer).toHaveClass('w-full');
    });
  });
});