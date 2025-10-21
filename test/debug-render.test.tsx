import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// Simple test component
const TestComponent = () => <div data-testid="test-element">Hello World</div>;

describe('Debug Render Test', () => {
  it('should render a simple component', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('test-element')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});