import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Make React available globally for JSX
global.React = React;

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-key';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/fitmeal_test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';

// Mock OpenAI completely to avoid browser environment issues
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: '{"recipes": []}' } }]
          })
        }
      },
      images: {
        generate: vi.fn().mockResolvedValue({
          data: [{ url: 'https://example.com/test-image.jpg' }]
        })
      }
    }))
  };
});

// Mock the OpenAI service functions
vi.mock('../server/services/openai', () => ({
  generateRecipes: vi.fn().mockResolvedValue([]),
  generateImageForRecipe: vi.fn().mockResolvedValue('https://example.com/test-image.jpg'),
  generateMealPlan: vi.fn().mockResolvedValue({ meals: [] })
}));

// Mock lucide-react icons with manual approach
vi.mock('lucide-react', () => {
  const createIcon = (name) => {
    const Icon = React.forwardRef((props, ref) => 
      React.createElement('svg', { 
        ref, 
        'data-testid': `${name.toLowerCase()}-icon`,
        ...props 
      })
    );
    Icon.displayName = name;
    return Icon;
  };
  
  // Return all the icons explicitly
  return {
    Dumbbell: createIcon('Dumbbell'),
    User: createIcon('User'),
    Mail: createIcon('Mail'),
    Lock: createIcon('Lock'),
    Home: createIcon('Home'),
    Settings: createIcon('Settings'),
    LogOut: createIcon('LogOut'),
    Menu: createIcon('Menu'),
    X: createIcon('X'),
    Plus: createIcon('Plus'),
    Minus: createIcon('Minus'),
    Check: createIcon('Check'),
    Search: createIcon('Search'),
    Filter: createIcon('Filter'),
    Download: createIcon('Download'),
    Upload: createIcon('Upload'),
    Trash: createIcon('Trash'),
    Edit: createIcon('Edit'),
    Eye: createIcon('Eye'),
    EyeOff: createIcon('EyeOff'),
    Calendar: createIcon('Calendar'),
    Clock: createIcon('Clock'),
    AlertCircle: createIcon('AlertCircle'),
    Info: createIcon('Info'),
    Loader2: createIcon('Loader2'),
    Star: createIcon('Star'),
    Heart: createIcon('Heart'),
    Activity: createIcon('Activity'),
    Target: createIcon('Target'),
    TrendingUp: createIcon('TrendingUp'),
    Award: createIcon('Award'),
    BarChart: createIcon('BarChart'),
    Camera: createIcon('Camera'),
    FileText: createIcon('FileText'),
    ShoppingCart: createIcon('ShoppingCart'),
    Users: createIcon('Users'),
    Zap: createIcon('Zap'),
    ChevronDown: createIcon('ChevronDown'),
    ChevronLeft: createIcon('ChevronLeft'),
    ChevronRight: createIcon('ChevronRight'),
    ChevronUp: createIcon('ChevronUp'),
  };
});

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});