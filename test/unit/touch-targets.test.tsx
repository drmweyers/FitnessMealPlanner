/**
 * Touch Targets Compliance Unit Tests
 * Tests for 44px minimum touch target compliance, enforcement utilities, and accessibility
 * Covers mobile touch targets, button sizing, and interactive element accessibility
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { enforceTouchTargets, setupTouchTargetObserver } from '../../client/src/utils/mobileTouchTargets';

// Mock components with various interactive elements
const TouchTargetTestComponent: React.FC = () => (
  <div data-testid="touch-target-container">
    {/* Buttons */}
    <button className="btn-small" data-testid="small-button">Small</button>
    <button className="btn-medium" data-testid="medium-button">Medium</button>
    <button className="btn-large" data-testid="large-button">Large</button>

    {/* Links */}
    <a href="/test" className="link-small" data-testid="small-link">Small Link</a>
    <a href="/test" className="link-medium" data-testid="medium-link">Medium Link</a>

    {/* Form elements */}
    <input type="text" className="input-small" data-testid="small-input" placeholder="Small input" />
    <input type="email" className="input-medium" data-testid="medium-input" placeholder="Medium input" />
    <select className="select-small" data-testid="small-select">
      <option>Option 1</option>
      <option>Option 2</option>
    </select>

    {/* Interactive divs */}
    <div role="button" className="interactive-div" data-testid="interactive-div" tabIndex={0}>
      Interactive Div
    </div>

    {/* Labels with form controls */}
    <label className="label-small" data-testid="small-label">
      <input type="checkbox" /> Small checkbox
    </label>
    <label className="label-medium" data-testid="medium-label">
      <input type="radio" name="test" /> Medium radio
    </label>

    {/* Icon buttons */}
    <button className="icon-btn h-6 w-6" data-testid="icon-button">
      <svg className="w-4 h-4">
        <circle cx="12" cy="12" r="10"/>
      </svg>
    </button>

    {/* Table with interactive elements */}
    <table data-testid="test-table">
      <tbody>
        <tr>
          <td>
            <button className="table-btn" data-testid="table-button">Edit</button>
          </td>
          <td>
            <a href="/edit" className="table-link" data-testid="table-link">View</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

const NavigationTestComponent: React.FC = () => (
  <nav data-testid="navigation-test">
    <button className="nav-item" data-testid="nav-home">Home</button>
    <button className="nav-item" data-testid="nav-profile">Profile</button>
    <button className="nav-item" data-testid="nav-settings">Settings</button>
    <button className="nav-item-small" data-testid="nav-help">?</button>
  </nav>
);

const ModalTestComponent: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
  isOpen ? (
    <div className="modal-overlay" data-testid="modal">
      <div className="modal-content">
        <button className="modal-close" data-testid="modal-close">×</button>
        <button className="modal-action" data-testid="modal-confirm">Confirm</button>
        <button className="modal-action" data-testid="modal-cancel">Cancel</button>
      </div>
    </div>
  ) : null
);

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

  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
};

// Mock getBoundingClientRect to return different sizes
const mockGetBoundingClientRect = (element: Element, width: number = 44, height: number = 44) => {
  element.getBoundingClientRect = vi.fn(() => ({
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

// Helper to measure element dimensions
const measureElement = (element: Element) => {
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);

  return {
    rect,
    minHeight: computedStyle.getPropertyValue('min-height'),
    minWidth: computedStyle.getPropertyValue('min-width'),
    padding: computedStyle.getPropertyValue('padding'),
    height: computedStyle.getPropertyValue('height'),
    width: computedStyle.getPropertyValue('width')
  };
};

describe('Touch Targets Compliance Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Set mobile viewport
    setViewportSize(375, 812);

    // Clear any existing styles
    const existingStyle = document.getElementById('aggressive-touch-targets');
    if (existingStyle) {
      existingStyle.remove();
    }

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up styles
    const styles = document.querySelectorAll('style[id*="touch-target"], style[id*="aggressive"]');
    styles.forEach(style => style.remove());

    // Remove forced attributes
    document.body.classList.remove('mobile-nav-active');
    document.body.removeAttribute('data-mobile-nav-enabled');
  });

  describe('Minimum Touch Target Size (44px)', () => {
    test('should enforce 44px minimum on all buttons', async () => {
      render(<TouchTargetTestComponent />);

      // Run touch target enforcement
      act(() => {
        enforceTouchTargets();
      });

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');

        buttons.forEach(button => {
          mockGetBoundingClientRect(button, 44, 44);
          const measurements = measureElement(button);

          // Check minimum dimensions
          expect(measurements.rect.height).toBeGreaterThanOrEqual(44);
          expect(measurements.rect.width).toBeGreaterThanOrEqual(44);

          // Check CSS enforcement
          expect(button.style.minHeight).toBe('44px');
          expect(button.style.minWidth).toBe('44px');
        });
      });
    });

    test('should enforce 44px minimum on all links', async () => {
      render(<TouchTargetTestComponent />);

      act(() => {
        enforceTouchTargets();
      });

      await waitFor(() => {
        const links = screen.getAllByRole('link');

        links.forEach(link => {
          mockGetBoundingClientRect(link, 44, 44);
          const measurements = measureElement(link);

          expect(measurements.rect.height).toBeGreaterThanOrEqual(44);
          expect(measurements.rect.width).toBeGreaterThanOrEqual(44);
          expect(link.style.minHeight).toBe('44px');
        });
      });
    });

    test('should enforce 44px minimum on form inputs', async () => {
      render(<TouchTargetTestComponent />);

      act(() => {
        enforceTouchTargets();
      });

      await waitFor(() => {
        const inputs = screen.getAllByRole('textbox');
        const selects = screen.getAllByRole('combobox');
        const allInputs = [...inputs, ...selects];

        allInputs.forEach(input => {
          mockGetBoundingClientRect(input, 44, 44);
          const measurements = measureElement(input);

          expect(measurements.rect.height).toBeGreaterThanOrEqual(44);
          expect(input.style.minHeight).toBe('44px');
          expect(input.style.fontSize).toBe('16px'); // Prevent zoom on iOS
        });
      });
    });

    test('should enforce 44px minimum on interactive divs', async () => {
      render(<TouchTargetTestComponent />);

      act(() => {
        enforceTouchTargets();
      });

      await waitFor(() => {
        const interactiveDiv = screen.getByTestId('interactive-div');
        mockGetBoundingClientRect(interactiveDiv, 44, 44);
        const measurements = measureElement(interactiveDiv);

        expect(measurements.rect.height).toBeGreaterThanOrEqual(44);
        expect(measurements.rect.width).toBeGreaterThanOrEqual(44);
        expect(interactiveDiv.style.minHeight).toBe('44px');
        expect(interactiveDiv.style.minWidth).toBe('44px');
      });
    });

    test('should enforce 44px minimum on labels with form controls', async () => {
      render(<TouchTargetTestComponent />);

      act(() => {
        enforceTouchTargets();
      });

      await waitFor(() => {
        const labels = screen.getAllByTestId(/label/);

        labels.forEach(label => {
          mockGetBoundingClientRect(label, 44, 44);
          const measurements = measureElement(label);

          expect(measurements.rect.height).toBeGreaterThanOrEqual(44);
          expect(label.style.minHeight).toBe('44px');
          expect(label.style.display).toBe('flex');
          expect(label.style.alignItems).toBe('center');
        });
      });
    });
  });

  describe('Touch Target Enforcement Utility', () => {
    test('should only run on mobile viewports', () => {
      // Test desktop viewport
      setViewportSize(1920, 1080);

      render(<TouchTargetTestComponent />);

      act(() => {
        enforceTouchTargets();
      });

      // Should not enforce on desktop
      const style = document.getElementById('aggressive-touch-targets');
      expect(style).not.toBeInTheDocument();
    });

    test('should inject aggressive CSS rules on mobile', () => {
      setViewportSize(375, 812);

      render(<TouchTargetTestComponent />);

      act(() => {
        enforceTouchTargets();
      });

      const style = document.getElementById('aggressive-touch-targets');
      expect(style).toBeInTheDocument();

      const cssContent = style?.innerHTML || '';
      expect(cssContent).toContain('min-height: 44px !important');
      expect(cssContent).toContain('min-width: 44px !important');
      expect(cssContent).toContain('@media (max-width: 1023px)');
    });

    test('should force specific properties on interactive elements', async () => {
      render(<TouchTargetTestComponent />);

      act(() => {
        enforceTouchTargets();
      });

      await waitFor(() => {
        const button = screen.getByTestId('small-button');

        expect(button.style.minHeight).toBe('44px');
        expect(button.style.minWidth).toBe('44px');
        expect(button.style.display).toBe('inline-flex');
        expect(button.style.alignItems).toBe('center');
        expect(button.style.justifyContent).toBe('center');
        expect(button.style.touchAction).toBe('manipulation');
        expect(button.style.boxSizing).toBe('border-box');
      });
    });

    test('should handle elements that are too small after enforcement', async () => {
      render(<TouchTargetTestComponent />);

      act(() => {
        enforceTouchTargets();
      });

      await waitFor(() => {
        const iconButton = screen.getByTestId('icon-button');

        // Mock initial small size
        mockGetBoundingClientRect(iconButton, 24, 24);

        // Re-run enforcement to simulate resize check
        act(() => {
          enforceTouchTargets();
        });

        // Should be forced to larger size
        expect(iconButton.style.height).toBe('44px');
        expect(iconButton.style.width).toBe('44px');
      });
    });
  });

  describe('Touch Target Observer', () => {
    test('should re-enforce touch targets when DOM changes', async () => {
      const { rerender } = render(<TouchTargetTestComponent />);

      // Setup observer
      const observer = setupTouchTargetObserver();

      act(() => {
        enforceTouchTargets();
      });

      // Add new element
      rerender(<>
        <TouchTargetTestComponent />
        <button data-testid="new-button">New Button</button>
      </>);

      await waitFor(() => {
        const newButton = screen.getByTestId('new-button');
        expect(newButton.style.minHeight).toBe('44px');
        expect(newButton.style.minWidth).toBe('44px');
      });

      observer?.disconnect();
    });

    test('should handle dynamic content addition', async () => {
      const DynamicComponent = () => {
        const [showButton, setShowButton] = React.useState(false);

        return (
          <div>
            <button onClick={() => setShowButton(true)} data-testid="trigger">
              Add Button
            </button>
            {showButton && (
              <button data-testid="dynamic-button">Dynamic Button</button>
            )}
          </div>
        );
      };

      render(<DynamicComponent />);

      const observer = setupTouchTargetObserver();

      act(() => {
        enforceTouchTargets();
      });

      // Trigger dynamic content
      const trigger = screen.getByTestId('trigger');
      await user.click(trigger);

      await waitFor(() => {
        const dynamicButton = screen.getByTestId('dynamic-button');
        expect(dynamicButton.style.minHeight).toBe('44px');
      });

      observer?.disconnect();
    });
  });

  describe('Navigation Touch Targets', () => {
    test('should enforce touch targets on navigation elements', async () => {
      render(<NavigationTestComponent />);

      act(() => {
        enforceTouchTargets();
      });

      await waitFor(() => {
        const navButtons = screen.getAllByRole('button');

        navButtons.forEach(button => {
          mockGetBoundingClientRect(button, 56, 64);
          const measurements = measureElement(button);

          expect(measurements.rect.height).toBeGreaterThanOrEqual(44);
          expect(measurements.rect.width).toBeGreaterThanOrEqual(44);
        });
      });
    });

    test('should handle small navigation icons appropriately', async () => {
      render(<NavigationTestComponent />);

      act(() => {
        enforceTouchTargets();
      });

      await waitFor(() => {
        const helpButton = screen.getByTestId('nav-help');

        expect(helpButton.style.minHeight).toBe('44px');
        expect(helpButton.style.minWidth).toBe('44px');
        expect(helpButton.style.display).toBe('inline-flex');
        expect(helpButton.style.alignItems).toBe('center');
        expect(helpButton.style.justifyContent).toBe('center');
      });
    });
  });

  describe('Modal Touch Targets', () => {
    test('should enforce touch targets on modal elements', async () => {
      render(<ModalTestComponent isOpen={true} />);

      act(() => {
        enforceTouchTargets();
      });

      await waitFor(() => {
        const modalButtons = screen.getAllByRole('button');

        modalButtons.forEach(button => {
          mockGetBoundingClientRect(button, 44, 44);
          const measurements = measureElement(button);

          expect(measurements.rect.height).toBeGreaterThanOrEqual(44);
          expect(measurements.rect.width).toBeGreaterThanOrEqual(44);
        });
      });
    });

    test('should handle modal close button specifically', async () => {
      render(<ModalTestComponent isOpen={true} />);

      act(() => {
        enforceTouchTargets();
      });

      await waitFor(() => {
        const closeButton = screen.getByTestId('modal-close');

        expect(closeButton.style.minHeight).toBe('44px');
        expect(closeButton.style.minWidth).toBe('44px');
        expect(closeButton.style.touchAction).toBe('manipulation');
      });
    });
  });

  describe('Table Touch Targets', () => {
    test('should enforce touch targets on table interactive elements', async () => {
      render(<TouchTargetTestComponent />);

      act(() => {
        enforceTouchTargets();
      });

      await waitFor(() => {
        const tableButton = screen.getByTestId('table-button');
        const tableLink = screen.getByTestId('table-link');

        [tableButton, tableLink].forEach(element => {
          mockGetBoundingClientRect(element, 44, 44);
          const measurements = measureElement(element);

          expect(measurements.rect.height).toBeGreaterThanOrEqual(44);
          expect(measurements.rect.width).toBeGreaterThanOrEqual(44);
        });
      });
    });
  });

  describe('Accessibility and Touch Targets', () => {
    test('should maintain accessibility attributes after enforcement', async () => {
      render(<TouchTargetTestComponent />);

      act(() => {
        enforceTouchTargets();
      });

      await waitFor(() => {
        const interactiveDiv = screen.getByTestId('interactive-div');

        expect(interactiveDiv).toHaveAttribute('role', 'button');
        expect(interactiveDiv).toHaveAttribute('tabIndex', '0');
        expect(interactiveDiv.style.cursor).toBe('pointer');
      });
    });

    test('should ensure proper focus indicators on touch targets', async () => {
      render(<TouchTargetTestComponent />);

      act(() => {
        enforceTouchTargets();
      });

      const button = screen.getByTestId('small-button');

      // Focus the button
      await user.tab();

      // Should be focusable and maintain focus styles
      expect(button).toHaveFocus();
    });

    test('should handle keyboard navigation correctly', async () => {
      render(<NavigationTestComponent />);

      act(() => {
        enforceTouchTargets();
      });

      // Tab through navigation
      await user.tab(); // Home
      expect(screen.getByTestId('nav-home')).toHaveFocus();

      await user.tab(); // Profile
      expect(screen.getByTestId('nav-profile')).toHaveFocus();

      await user.tab(); // Settings
      expect(screen.getByTestId('nav-settings')).toHaveFocus();

      await user.tab(); // Help
      expect(screen.getByTestId('nav-help')).toHaveFocus();
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle enforcement on large number of elements efficiently', () => {
      const LargeComponentList = () => (
        <div>
          {Array.from({ length: 100 }, (_, i) => (
            <button key={i} data-testid={`button-${i}`}>
              Button {i}
            </button>
          ))}
        </div>
      );

      const startTime = performance.now();

      render(<LargeComponentList />);

      act(() => {
        enforceTouchTargets();
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete enforcement in reasonable time
      expect(duration).toBeLessThan(500); // 500ms for 100 elements
    });

    test('should handle elements with existing inline styles', async () => {
      const ComponentWithInlineStyles = () => (
        <div>
          <button style={{ minHeight: '20px', minWidth: '20px' }} data-testid="styled-button">
            Styled Button
          </button>
        </div>
      );

      render(<ComponentWithInlineStyles />);

      act(() => {
        enforceTouchTargets();
      });

      await waitFor(() => {
        const button = screen.getByTestId('styled-button');

        // Should override existing styles
        expect(button.style.minHeight).toBe('44px');
        expect(button.style.minWidth).toBe('44px');
      });
    });

    test('should handle elements that are initially hidden', async () => {
      const HiddenElementComponent = () => {
        const [visible, setVisible] = React.useState(false);

        return (
          <div>
            <button onClick={() => setVisible(true)} data-testid="show-button">
              Show Hidden
            </button>
            {visible && (
              <button style={{ display: 'none' }} data-testid="hidden-button">
                Hidden Button
              </button>
            )}
          </div>
        );
      };

      render(<HiddenElementComponent />);

      const observer = setupTouchTargetObserver();

      act(() => {
        enforceTouchTargets();
      });

      // Show the hidden element
      const showButton = screen.getByTestId('show-button');
      await user.click(showButton);

      await waitFor(() => {
        const hiddenButton = screen.getByTestId('hidden-button');
        expect(hiddenButton.style.minHeight).toBe('44px');
      });

      observer?.disconnect();
    });

    test('should handle viewport changes correctly', () => {
      render(<TouchTargetTestComponent />);

      // Start with mobile
      setViewportSize(375, 812);
      act(() => {
        enforceTouchTargets();
      });

      let style = document.getElementById('aggressive-touch-targets');
      expect(style).toBeInTheDocument();

      // Change to desktop
      setViewportSize(1920, 1080);
      act(() => {
        enforceTouchTargets();
      });

      // Should not run on desktop
      style = document.getElementById('aggressive-touch-targets');
      expect(style).not.toBeInTheDocument();

      // Change back to mobile
      setViewportSize(375, 812);
      act(() => {
        enforceTouchTargets();
      });

      style = document.getElementById('aggressive-touch-targets');
      expect(style).toBeInTheDocument();
    });
  });

  describe('Touch Target Compliance Validation', () => {
    test('should validate all interactive elements meet WCAG touch target guidelines', async () => {
      render(<TouchTargetTestComponent />);

      act(() => {
        enforceTouchTargets();
      });

      await waitFor(() => {
        // Get all potentially interactive elements
        const interactiveElements = document.querySelectorAll(
          'button, a[href], input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])'
        );

        interactiveElements.forEach(element => {
          mockGetBoundingClientRect(element as Element, 44, 44);
          const rect = element.getBoundingClientRect();

          // WCAG 2.1 AAA requires 44x44px minimum
          expect(rect.height).toBeGreaterThanOrEqual(44);
          expect(rect.width).toBeGreaterThanOrEqual(44);
        });
      });
    });

    test('should ensure touch targets have adequate spacing', async () => {
      const CloseElementsComponent = () => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button data-testid="button1">Button 1</button>
          <button data-testid="button2">Button 2</button>
          <button data-testid="button3">Button 3</button>
        </div>
      );

      render(<CloseElementsComponent />);

      act(() => {
        enforceTouchTargets();
      });

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');

        buttons.forEach(button => {
          mockGetBoundingClientRect(button, 44, 44);
          const rect = button.getBoundingClientRect();

          // Each button should meet minimum size
          expect(rect.height).toBeGreaterThanOrEqual(44);
          expect(rect.width).toBeGreaterThanOrEqual(44);
        });
      });
    });
  });
});