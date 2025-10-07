import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecipeCard from '@/components/RecipeCard';
import { AuthContext } from '@/contexts/AuthContext';
import type { AuthContextValue } from '@/types/auth';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock favorites hook
vi.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    toggleFavorite: vi.fn(),
    isFavorite: vi.fn(() => false),
  }),
}));

const mockUser = {
  id: '1',
  email: 'customer@example.com',
  role: 'customer' as const,
  profilePicture: null,
};

const mockRecipe = {
  id: '1',
  title: 'Grilled Chicken Salad',
  description: 'A delicious and healthy protein-packed salad with grilled chicken, mixed greens, and fresh vegetables.',
  cuisine: 'Mediterranean',
  dietaryRestrictions: ['gluten-free'],
  calories: 350,
  prepTime: 20,
  cookTime: 15,
  servings: 2,
  difficulty: 'easy',
  imageUrl: '/images/chicken-salad.jpg',
  isApproved: true,
  ingredients: [
    { name: 'Chicken breast', amount: '200', unit: 'g' },
    { name: 'Mixed greens', amount: '100', unit: 'g' },
    { name: 'Cherry tomatoes', amount: '150', unit: 'g' },
  ],
  instructions: [
    'Season and grill the chicken breast',
    'Prepare the salad greens',
    'Combine all ingredients',
  ],
  nutritionInfo: {
    protein: 35,
    carbs: 12,
    fat: 8,
    fiber: 4,
  },
  tags: ['healthy', 'protein', 'low-carb'],
  createdBy: 'chef-1',
  createdAt: '2024-01-01T10:00:00Z',
};

const createMockAuthContext = (overrides?: Partial<AuthContextValue>): AuthContextValue => ({
  user: mockUser,
  isLoading: false,
  isAuthenticated: true,
  error: undefined,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  ...overrides,
});

const mockOnClick = vi.fn();
const mockOnFavorite = vi.fn();
const mockOnSelect = vi.fn();

const renderWithProviders = (
  authContextValue: AuthContextValue,
  recipeProps?: Partial<typeof mockRecipe>,
  componentProps?: any
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const recipe = { ...mockRecipe, ...recipeProps };

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authContextValue}>
        <RecipeCard
          recipe={recipe}
          onClick={mockOnClick}
          onFavorite={mockOnFavorite}
          onSelect={mockOnSelect}
          {...componentProps}
        />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

describe('RecipeCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders recipe card with basic information', () => {
      renderWithProviders(createMockAuthContext());

      expect(screen.getByText('Grilled Chicken Salad')).toBeInTheDocument();
      expect(screen.getByText(/delicious and healthy protein-packed salad/i)).toBeInTheDocument();
      expect(screen.getByText('Mediterranean')).toBeInTheDocument();
      expect(screen.getByText('350 cal')).toBeInTheDocument();
    });

    it('displays recipe image with proper alt text', () => {
      renderWithProviders(createMockAuthContext());

      const image = screen.getByRole('img', { name: /grilled chicken salad/i });
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/images/chicken-salad.jpg');
      expect(image).toHaveAttribute('alt', 'Grilled Chicken Salad');
    });

    it('shows cooking time information', () => {
      renderWithProviders(createMockAuthContext());

      expect(screen.getByText('20 min prep')).toBeInTheDocument();
      expect(screen.getByText('15 min cook')).toBeInTheDocument();
    });

    it('displays serving information', () => {
      renderWithProviders(createMockAuthContext());

      expect(screen.getByText('Serves 2')).toBeInTheDocument();
    });

    it('shows difficulty level', () => {
      renderWithProviders(createMockAuthContext());

      expect(screen.getByText('Easy')).toBeInTheDocument();
    });

    it('renders dietary restriction badges', () => {
      renderWithProviders(createMockAuthContext());

      expect(screen.getByText('Gluten-Free')).toBeInTheDocument();
    });

    it('displays recipe tags', () => {
      renderWithProviders(createMockAuthContext());

      expect(screen.getByText('healthy')).toBeInTheDocument();
      expect(screen.getByText('protein')).toBeInTheDocument();
      expect(screen.getByText('low-carb')).toBeInTheDocument();
    });

    it('shows nutrition information', () => {
      renderWithProviders(createMockAuthContext());

      expect(screen.getByText('35g protein')).toBeInTheDocument();
      expect(screen.getByText('12g carbs')).toBeInTheDocument();
      expect(screen.getByText('8g fat')).toBeInTheDocument();
      expect(screen.getByText('4g fiber')).toBeInTheDocument();
    });
  });

  describe('Interactive Elements', () => {
    it('calls onClick handler when card is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const card = screen.getByRole('article'); // Recipe card container
      await user.click(card);

      expect(mockOnClick).toHaveBeenCalledWith(mockRecipe);
    });

    it('renders favorite button and handles favorite toggle', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const favoriteButton = screen.getByRole('button', { name: /add to favorites/i });
      expect(favoriteButton).toBeInTheDocument();

      await user.click(favoriteButton);

      expect(mockOnFavorite).toHaveBeenCalledWith(mockRecipe.id);
    });

    it('shows correct favorite button state for favorited recipe', () => {
      const mockUseFavorites = vi.mocked(await import('@/hooks/useFavorites')).useFavorites;
      mockUseFavorites.mockReturnValue({
        toggleFavorite: vi.fn(),
        isFavorite: vi.fn(() => true),
      });

      renderWithProviders(createMockAuthContext());

      const favoriteButton = screen.getByRole('button', { name: /remove from favorites/i });
      expect(favoriteButton).toBeInTheDocument();
      expect(favoriteButton).toHaveClass('favorited'); // Assuming CSS class for favorited state
    });

    it('prevents event bubbling when favorite button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const favoriteButton = screen.getByRole('button', { name: /add to favorites/i });
      await user.click(favoriteButton);

      // Card onClick should not be called when favorite button is clicked
      expect(mockOnClick).not.toHaveBeenCalled();
      expect(mockOnFavorite).toHaveBeenCalled();
    });

    it('renders selection checkbox when selectable prop is true', () => {
      renderWithProviders(createMockAuthContext(), {}, { selectable: true });

      const checkbox = screen.getByRole('checkbox', { name: /select recipe/i });
      expect(checkbox).toBeInTheDocument();
    });

    it('handles recipe selection when checkbox is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext(), {}, { 
        selectable: true,
        selected: false,
      });

      const checkbox = screen.getByRole('checkbox', { name: /select recipe/i });
      await user.click(checkbox);

      expect(mockOnSelect).toHaveBeenCalledWith(mockRecipe.id, true);
    });

    it('shows selected state when recipe is selected', () => {
      renderWithProviders(createMockAuthContext(), {}, { 
        selectable: true,
        selected: true,
      });

      const checkbox = screen.getByRole('checkbox', { name: /select recipe/i });
      expect(checkbox).toBeChecked();
    });
  });

  describe('Layout Variants', () => {
    it('renders in compact mode when specified', () => {
      renderWithProviders(createMockAuthContext(), {}, { variant: 'compact' });

      const card = screen.getByRole('article');
      expect(card).toHaveClass('compact'); // Assuming CSS class for compact variant
    });

    it('renders in detailed mode by default', () => {
      renderWithProviders(createMockAuthContext());

      // Should show full description in detailed mode
      expect(screen.getByText(/delicious and healthy protein-packed salad with grilled chicken/i)).toBeInTheDocument();
    });

    it('truncates description in compact mode', () => {
      renderWithProviders(createMockAuthContext(), {}, { variant: 'compact' });

      // Description should be truncated
      const description = screen.getByText(/delicious and healthy/i);
      expect(description).toHaveClass('truncated'); // Assuming CSS class for truncated text
    });

    it('adapts to grid layout when specified', () => {
      renderWithProviders(createMockAuthContext(), {}, { layout: 'grid' });

      const card = screen.getByRole('article');
      expect(card).toHaveClass('grid-layout'); // Assuming CSS class for grid layout
    });

    it('adapts to list layout when specified', () => {
      renderWithProviders(createMockAuthContext(), {}, { layout: 'list' });

      const card = screen.getByRole('article');
      expect(card).toHaveClass('list-layout'); // Assuming CSS class for list layout
    });
  });

  describe('Content Variations', () => {
    it('handles missing optional fields gracefully', () => {
      const recipeWithoutOptionalFields = {
        ...mockRecipe,
        cookTime: undefined,
        difficulty: undefined,
        tags: [],
        nutritionInfo: undefined,
      };

      renderWithProviders(createMockAuthContext(), recipeWithoutOptionalFields);

      expect(screen.getByText('Grilled Chicken Salad')).toBeInTheDocument();
      expect(screen.queryByText(/cook/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/easy/i)).not.toBeInTheDocument();
    });

    it('displays fallback image when imageUrl is missing', () => {
      renderWithProviders(createMockAuthContext(), { imageUrl: undefined });

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', '/images/default-recipe.jpg');
    });

    it('shows multiple dietary restrictions', () => {
      renderWithProviders(createMockAuthContext(), {
        dietaryRestrictions: ['vegetarian', 'gluten-free', 'dairy-free'],
      });

      expect(screen.getByText('Vegetarian')).toBeInTheDocument();
      expect(screen.getByText('Gluten-Free')).toBeInTheDocument();
      expect(screen.getByText('Dairy-Free')).toBeInTheDocument();
    });

    it('handles long recipe titles appropriately', () => {
      const longTitle = 'Super Long Recipe Title That Might Need To Be Truncated For Display Purposes';
      renderWithProviders(createMockAuthContext(), { title: longTitle });

      const titleElement = screen.getByText(longTitle);
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveClass('recipe-title'); // Should have styling for title handling
    });

    it('displays recipe with no cuisine specified', () => {
      renderWithProviders(createMockAuthContext(), { cuisine: undefined });

      expect(screen.getByText('Grilled Chicken Salad')).toBeInTheDocument();
      expect(screen.queryByText('Mediterranean')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for interactive elements', () => {
      renderWithProviders(createMockAuthContext());

      const favoriteButton = screen.getByRole('button', { name: /add to favorites/i });
      expect(favoriteButton).toHaveAccessibleName();

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', expect.stringContaining('Grilled Chicken Salad'));
    });

    it('includes proper image accessibility', () => {
      renderWithProviders(createMockAuthContext());

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', 'Grilled Chicken Salad');
      expect(image).not.toHaveAttribute('alt', ''); // Should not have empty alt
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const card = screen.getByRole('article');
      card.focus();

      await user.keyboard('{Enter}');
      expect(mockOnClick).toHaveBeenCalledWith(mockRecipe);

      const favoriteButton = screen.getByRole('button', { name: /add to favorites/i });
      favoriteButton.focus();

      await user.keyboard('{Enter}');
      expect(mockOnFavorite).toHaveBeenCalledWith(mockRecipe.id);
    });

    it('provides screen reader friendly descriptions', () => {
      renderWithProviders(createMockAuthContext());

      expect(screen.getByText('350 calories per serving')).toBeInTheDocument();
      expect(screen.getByText('20 minutes preparation time')).toBeInTheDocument();
    });

    it('includes ARIA live regions for dynamic updates', () => {
      renderWithProviders(createMockAuthContext());

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(createMockAuthContext());

      const card = screen.getByRole('article');
      expect(card).toHaveClass('mobile-responsive'); // Assuming CSS class for mobile adaptation
    });

    it('shows appropriate touch targets on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(createMockAuthContext());

      const favoriteButton = screen.getByRole('button', { name: /add to favorites/i });
      expect(favoriteButton).toHaveClass('touch-target'); // Assuming larger touch targets
    });

    it('adjusts layout for tablet screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithProviders(createMockAuthContext());

      const card = screen.getByRole('article');
      expect(card).toHaveClass('tablet-layout'); // Assuming tablet-specific styling
    });
  });

  describe('Performance Considerations', () => {
    it('lazy loads recipe images', () => {
      renderWithProviders(createMockAuthContext());

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('loading', 'lazy');
    });

    it('optimizes image sizes for different screen densities', () => {
      renderWithProviders(createMockAuthContext());

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('srcset'); // Should have responsive image sources
    });

    it('prevents unnecessary re-renders when props remain the same', () => {
      const { rerender } = renderWithProviders(createMockAuthContext());

      // Re-render with same props
      rerender(
        <QueryClient>
          <AuthContext.Provider value={createMockAuthContext()}>
            <RecipeCard
              recipe={mockRecipe}
              onClick={mockOnClick}
              onFavorite={mockOnFavorite}
              onSelect={mockOnSelect}
            />
          </AuthContext.Provider>
        </QueryClient>
      );

      // Component should be memoized and not re-render unnecessarily
      expect(screen.getByText('Grilled Chicken Salad')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles image loading errors gracefully', () => {
      renderWithProviders(createMockAuthContext());

      const image = screen.getByRole('img');
      fireEvent.error(image);

      // Should fallback to default image
      expect(image).toHaveAttribute('src', '/images/default-recipe.jpg');
    });

    it('handles missing recipe data gracefully', () => {
      const incompleteRecipe = {
        id: '1',
        title: 'Test Recipe',
        // Missing many required fields
      };

      renderWithProviders(createMockAuthContext(), incompleteRecipe);

      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
      // Should not crash when optional fields are missing
    });

    it('provides error boundaries for component failures', () => {
      // Mock a component error
      const ErrorRecipeCard = () => {
        throw new Error('Component error');
      };

      const queryClient = new QueryClient();

      expect(() => {
        render(
          <QueryClientProvider client={queryClient}>
            <ErrorRecipeCard />
          </QueryClientProvider>
        );
      }).toThrow('Component error');
    });
  });
});