/**
 * Mobile Touch Target Enforcement Utility
 * Ensures 100% compliance with 44px minimum touch targets
 */

export function enforceTouchTargets() {
  if (typeof window === 'undefined') return;

  // Only run on mobile devices
  const isMobile = window.innerWidth <= 1023;
  if (!isMobile) return;

  // Create aggressive CSS rules
  const style = document.createElement('style');
  style.id = 'aggressive-touch-targets';
  style.innerHTML = `
    /* AGGRESSIVE TOUCH TARGET ENFORCEMENT */
    @media (max-width: 1023px) {
      /* Force ALL interactive elements to meet 44px minimum */
      button,
      a[href],
      input,
      select,
      textarea,
      [role="button"],
      [tabindex]:not([tabindex="-1"]),
      .btn,
      .button,
      [onclick],
      label {
        min-height: 44px !important;
        min-width: 44px !important;
        padding: 12px 16px !important;
        box-sizing: border-box !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        touch-action: manipulation !important;
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1) !important;
      }

      /* Override ALL small size classes */
      .h-4, .h-5, .h-6, .h-7, .h-8, .h-9, .h-10,
      .w-4, .w-5, .w-6, .w-7, .w-8, .w-9, .w-10,
      .text-xs, .text-sm,
      .btn-xs, .btn-sm {
        min-height: 44px !important;
        min-width: 44px !important;
        padding: 10px 12px !important;
      }

      /* Input elements */
      input, select, textarea {
        min-height: 44px !important;
        padding: 12px 16px !important;
        font-size: 16px !important;
      }

      /* Links */
      a[href] {
        min-height: 44px !important;
        padding: 12px 8px !important;
        display: inline-flex !important;
        align-items: center !important;
      }

      /* Icon buttons and small elements */
      svg, .icon {
        min-height: 24px !important;
        min-width: 24px !important;
      }

      /* Checkboxes and radio buttons */
      input[type="checkbox"],
      input[type="radio"] {
        width: 20px !important;
        height: 20px !important;
        margin: 12px !important;
      }

      /* Labels with form controls */
      label {
        min-height: 44px !important;
        display: flex !important;
        align-items: center !important;
        padding: 8px 0 !important;
      }

      /* Table buttons and links */
      td button, td a, th button, th a {
        min-height: 44px !important;
        min-width: 44px !important;
        padding: 8px 12px !important;
      }
    }
  `;

  // Remove existing style if present
  const existingStyle = document.getElementById('aggressive-touch-targets');
  if (existingStyle) {
    existingStyle.remove();
  }

  document.head.appendChild(style);

  // Use JavaScript to force compliance on all elements
  setTimeout(() => {
    const interactiveSelectors = [
      'button',
      'a[href]',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[tabindex]:not([tabindex="-1"])',
      '.btn',
      '.button',
      '[onclick]',
      'label',
      '[type="submit"]',
      '[type="button"]'
    ];

    interactiveSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const htmlElement = element as HTMLElement;

        // Force minimum dimensions aggressively
        htmlElement.style.minHeight = '44px';
        htmlElement.style.minWidth = '44px';

        // Ensure element takes up the minimum space
        const rect = htmlElement.getBoundingClientRect();
        if (rect.height < 44) {
          htmlElement.style.padding = '12px 16px';
          htmlElement.style.height = '44px';
          htmlElement.style.lineHeight = '1.2';
        }
        if (rect.width < 44) {
          htmlElement.style.width = '44px';
        }

        // Ensure proper display and alignment
        if (htmlElement.tagName === 'BUTTON' || htmlElement.tagName === 'A') {
          htmlElement.style.display = 'inline-flex';
          htmlElement.style.alignItems = 'center';
          htmlElement.style.justifyContent = 'center';
          if (!htmlElement.style.padding || htmlElement.style.padding === '0px') {
            htmlElement.style.padding = '12px 16px';
          }
          htmlElement.style.boxSizing = 'border-box';
        }

        // Add touch-friendly properties
        htmlElement.style.touchAction = 'manipulation';
        htmlElement.style.cursor = 'pointer';
      });
    });

    // Special handling for form inputs
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const htmlInput = input as HTMLElement;
      htmlInput.style.minHeight = '44px';
      htmlInput.style.padding = '12px 16px';
      htmlInput.style.fontSize = '16px';
      htmlInput.style.boxSizing = 'border-box';
    });

    // Special handling for links
    const links = document.querySelectorAll('a[href]');
    links.forEach(link => {
      const htmlLink = link as HTMLElement;
      htmlLink.style.minHeight = '44px';
      htmlLink.style.display = 'inline-flex';
      htmlLink.style.alignItems = 'center';
      if (!htmlLink.style.padding || htmlLink.style.padding === '0px') {
        htmlLink.style.padding = '12px 8px';
      }
      htmlLink.style.textDecoration = 'underline';
    });

    // Special handling for labels
    const labels = document.querySelectorAll('label');
    labels.forEach(label => {
      const htmlLabel = label as HTMLElement;
      htmlLabel.style.minHeight = '44px';
      htmlLabel.style.display = 'flex';
      htmlLabel.style.alignItems = 'center';
      htmlLabel.style.padding = '8px 0';
      htmlLabel.style.cursor = 'pointer';
    });

  }, 100);
}

export function setupTouchTargetObserver() {
  if (typeof window === 'undefined') return;

  // Re-enforce touch targets when DOM changes
  const observer = new MutationObserver(() => {
    if (window.innerWidth <= 1023) {
      setTimeout(enforceTouchTargets, 50);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });

  return observer;
}

// Auto-initialize on load
if (typeof window !== 'undefined') {
  // Run immediately
  enforceTouchTargets();

  // Run after DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enforceTouchTargets);
  }

  // Setup observer for dynamic content
  setupTouchTargetObserver();

  // Re-run on resize
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 1023) {
      setTimeout(enforceTouchTargets, 100);
    }
  });

  // Run when page becomes visible (for cases where styles haven't applied)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.innerWidth <= 1023) {
      setTimeout(enforceTouchTargets, 100);
    }
  });
}