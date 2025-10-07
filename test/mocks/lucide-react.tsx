import React from 'react';
import { vi } from 'vitest';

// Create a mock icon component that accepts all props
const createMockIcon = (name: string) => {
  const MockIcon = React.forwardRef<SVGSVGElement, any>(({ children, ...props }, ref) => (
    <svg ref={ref} data-testid={`${name}-icon`} {...props}>
      {children}
    </svg>
  ));
  MockIcon.displayName = name;
  return MockIcon;
};

// Export a Proxy that creates mock icons on demand
const handler = {
  get(_target: any, prop: string) {
    // Return the mock icon for any requested icon name
    return createMockIcon(prop);
  }
};

module.exports = new Proxy({}, handler);