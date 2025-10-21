import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Simple test component
const TestComponent = () => <div data-testid="test-element">Hello World</div>;

describe('Debug Render Test', () => {
  beforeEach(() => {
    // Debug: Check DOM state
    console.log('DOM before test:', {
      body: !!document.body,
      bodyChildren: document.body?.children.length,
      rootElement: !!document.getElementById('root')
    });
    
    // Ensure DOM container exists
    if (!document.body) {
      document.documentElement.appendChild(document.createElement('body'));
    }
    
    // Clear existing content
    document.body.innerHTML = '';
    
    // Create and append container
    const container = document.createElement('div');
    container.id = 'root';
    container.setAttribute('data-testid', 'test-container');
    
    // Force append using different methods
    try {
      document.body.appendChild(container);
    } catch (e) {
      console.log('appendChild failed:', e);
      // Try alternative method
      document.body.insertAdjacentElement('beforeend', container);
    }
    
    // Verify the container was actually added
    const verifyContainer = document.getElementById('root');
    console.log('Container verification:', {
      containerExists: !!verifyContainer,
      containerParent: verifyContainer?.parentNode === document.body,
      bodyHTML: document.body.outerHTML
    });
    
    console.log('DOM after setup:', {
      body: !!document.body,
      bodyChildren: document.body?.children.length,
      rootElement: !!document.getElementById('root')
    });
  });

  it('should render a simple component', () => {
    console.log('DOM at test start:', {
      body: !!document.body,
      bodyChildren: document.body?.children.length,
      rootElement: !!document.getElementById('root')
    });
    
    // Try setting innerHTML directly instead of appendChild
    document.body.innerHTML = '<div id="test-root"></div>';
    const container = document.getElementById('test-root');
    
    console.log('After innerHTML approach:', {
      bodyChildren: document.body?.children.length,
      containerExists: !!container,
      bodyHTML: document.body.outerHTML
    });
    
    render(<TestComponent />, { container });
    expect(screen.getByTestId('test-element')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});