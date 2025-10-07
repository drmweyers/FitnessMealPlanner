import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Simple mock button component for testing
const MockButton = ({ children, onClick, disabled }: any) => (
  <button onClick={onClick} disabled={disabled}>
    {children}
  </button>
);

// Simple test modal component
const SimpleModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  
  return (
    <div data-testid="modal" role="dialog">
      <h2>Export Data as JSON</h2>
      <MockButton onClick={onClose}>Close</MockButton>
    </div>
  );
};

describe('Simple Modal Component Test', () => {
  const mockOnClose = vi.fn();

  it('should not render when isOpen is false', () => {
    render(<SimpleModal isOpen={false} onClose={mockOnClose} />);
    
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Export Data as JSON')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(<SimpleModal isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Export Data as JSON')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(<SimpleModal isOpen={true} onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    closeButton.click();
    
    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it('should have correct accessibility attributes', () => {
    render(<SimpleModal isOpen={true} onClose={mockOnClose} />);
    
    const modal = screen.getByTestId('modal');
    expect(modal).toHaveAttribute('role', 'dialog');
  });
});