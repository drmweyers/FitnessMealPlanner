import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll } from 'vitest';
import React from 'react';

// Make React available globally for JSX
global.React = React;

// Mock fetch for API calls
global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
  // Default successful response
  const mockResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue(''),
    blob: vi.fn().mockResolvedValue(new Blob()),
  };

  // Handle different API endpoints
  if (typeof url === 'string') {
    // Admin endpoints
    if (url.includes('/api/admin/stats')) {
      mockResponse.json = vi.fn().mockResolvedValue({
        totalRecipes: 95,
        approvedRecipes: 75,
        pendingRecipes: 20,
        totalUsers: 150,
        trainers: 25,
        customers: 120,
        admins: 5
      });
    } else if (url.includes('/api/admin/recipes') && url.includes('approved=false')) {
      mockResponse.json = vi.fn().mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({
          id: `recipe-${i + 1}`,
          name: `Test Recipe ${i + 1}`,
          description: `Test description ${i + 1}`,
          approved: false,
          mealTypes: ['lunch'],
          dietaryTags: ['high-protein'],
          mainIngredientTags: ['chicken'],
          ingredientsJson: [{ name: 'Chicken', amount: '200', unit: 'g' }],
          instructionsJson: ['Cook the chicken'],
          nutritionJson: { calories: 300, protein: 25, carbs: 10, fat: 15 },
          prepTimeMinutes: 30,
          cookTimeMinutes: 20,
          servings: 2,
          imageUrl: 'https://example.com/image.jpg',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }))
      );
    } else if (url.includes('/api/admin/generate-recipes') || url.includes('/api/admin/generate')) {
      mockResponse.json = vi.fn().mockResolvedValue({
        message: 'Recipes generated successfully',
        count: 10,
        recipes: Array.from({ length: 10 }, (_, i) => ({
          id: `generated-recipe-${i + 1}`,
          name: `Generated Recipe ${i + 1}`,
          approved: false
        }))
      });
    } else if (url.includes('/api/admin/recipes/') && options?.method === 'PATCH') {
      mockResponse.json = vi.fn().mockResolvedValue({
        message: 'Recipe approved successfully'
      });
    }
    
    // User authentication endpoints
    else if (url.includes('/api/auth/login')) {
      mockResponse.json = vi.fn().mockResolvedValue({
        user: {
          id: '1',
          email: 'admin@fitmeal.pro',
          role: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          username: 'admin'
        },
        token: 'mock-jwt-token'
      });
    } else if (url.includes('/api/auth/verify')) {
      mockResponse.json = vi.fn().mockResolvedValue({
        user: {
          id: '1',
          email: 'admin@fitmeal.pro',
          role: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          username: 'admin'
        }
      });
    }
    
    // Recipe endpoints
    else if (url.includes('/api/recipes')) {
      // Generate mock recipes for consistent testing
      const mockRecipes = Array.from({ length: 8 }, (_, i) => ({
        id: `recipe-${i + 1}`,
        name: `Test Recipe ${i + 1}`,
        description: `Test description ${i + 1}`,
        approved: true,
        mealTypes: ['lunch'],
        dietaryTags: ['high-protein'],
        mainIngredientTags: ['chicken'],
        ingredientsJson: [{ name: 'Chicken', amount: '200', unit: 'g' }],
        instructionsJson: ['Cook the chicken'],
        nutritionJson: { calories: 300, protein: 25, carbs: 10, fat: 15 },
        prepTimeMinutes: 30,
        cookTimeMinutes: 20,
        servings: 2,
        imageUrl: 'https://example.com/image.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      // Return paginated response format that Admin component expects
      mockResponse.json = vi.fn().mockResolvedValue({
        recipes: mockRecipes,
        total: mockRecipes.length,
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
    }
    
    // Meal plan endpoints
    else if (url.includes('/api/meal-plans')) {
      mockResponse.json = vi.fn().mockResolvedValue([]);
    }
  }

  return Promise.resolve(mockResponse);
});

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-key';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/fitmeal';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-that-is-long-enough-to-meet-minimum-requirements';
process.env.SESSION_SECRET = 'test-session-secret-for-testing-that-is-long-enough-to-meet-minimum-requirements';
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

// Mock storage service - using factory pattern to allow test-specific overrides
vi.mock('../server/storage', () => {
  return {
    storage: {
      // Recipe search methods - provide default successful returns
      searchRecipes: vi.fn().mockResolvedValue({
        recipes: [
          {
            id: 'recipe-1',
            name: 'Test Recipe 1',
            description: 'Test description',
            caloriesKcal: 300,
            proteinGrams: '25',
            carbsGrams: '30',
            fatGrams: '8',
            prepTimeMinutes: 15,
            cookTimeMinutes: 20,
            servings: 2,
            mealTypes: ['lunch'],
            dietaryTags: ['high-protein'],
            mainIngredientTags: ['chicken'],
            ingredientsJson: [{ name: 'Chicken', amount: '200', unit: 'g' }],
            instructionsText: 'Cook the chicken',
            imageUrl: 'https://example.com/image.jpg',
            approved: true,
            isApproved: true,
            createdAt: new Date().toISOString(),
          }
        ],
        total: 1,
      }),
      getPersonalizedRecipes: vi.fn().mockResolvedValue([]),
      getRecipe: vi.fn().mockResolvedValue(null),
      getRecipeById: vi.fn().mockResolvedValue(null),
      getAllRecipes: vi.fn().mockResolvedValue([]),
      
      // User methods
      getUserByEmail: vi.fn(),
      getUserById: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
      getUsers: vi.fn(),
      
      // Recipe CRUD methods
      createRecipe: vi.fn(),
      updateRecipe: vi.fn(),
      deleteRecipe: vi.fn(),
      getRecipes: vi.fn(),
      
      // Meal plan methods - provide default successful returns
      createMealPlan: vi.fn().mockResolvedValue({ id: 'meal-plan-1', name: 'Test Plan' }),
      getMealPlans: vi.fn().mockResolvedValue([]),
      getMealPlanById: vi.fn().mockResolvedValue(null),
      updateMealPlan: vi.fn().mockResolvedValue(null),
      deleteMealPlan: vi.fn().mockResolvedValue(false),
      saveMealPlan: vi.fn().mockResolvedValue({ id: 'meal-plan-1', name: 'Test Plan' }),
      getUserMealPlans: vi.fn().mockResolvedValue([]),
      getMealPlan: vi.fn().mockResolvedValue(null),
      
      // Admin methods
      getAdminStats: vi.fn(),
      
      // Trainer health protocol methods
      createTrainerHealthProtocol: vi.fn(),
      getTrainerHealthProtocols: vi.fn(),
      updateTrainerHealthProtocol: vi.fn(),
      deleteTrainerHealthProtocol: vi.fn(),
      
      // Assignment methods
      createProtocolAssignment: vi.fn(),
      getProtocolAssignments: vi.fn(),
      updateProtocolAssignment: vi.fn(),
      deleteProtocolAssignment: vi.fn(),
    }
  };
});

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
    Trash2: createIcon('Trash2'),
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
    Sparkles: createIcon('Sparkles'),
    Wand2: createIcon('Wand2'),
    RefreshCw: createIcon('RefreshCw'),
    Send: createIcon('Send'),
    Save: createIcon('Save'),
    Copy: createIcon('Copy'),
    Share: createIcon('Share'),
    ExternalLink: createIcon('ExternalLink'),
    ArrowRight: createIcon('ArrowRight'),
    ArrowLeft: createIcon('ArrowLeft'),
    ArrowUp: createIcon('ArrowUp'),
    ArrowDown: createIcon('ArrowDown'),
    MoreHorizontal: createIcon('MoreHorizontal'),
    MoreVertical: createIcon('MoreVertical'),
    Grid: createIcon('Grid'),
    Grid3X3: createIcon('Grid3X3'),
    Table: createIcon('Table'),
    List: createIcon('List'),
    Bookmark: createIcon('Bookmark'),
    Tag: createIcon('Tag'),
    Image: createIcon('Image'),
    Play: createIcon('Play'),
    Pause: createIcon('Pause'),
    Stop: createIcon('Stop'),
    SkipForward: createIcon('SkipForward'),
    SkipBack: createIcon('SkipBack'),
    Volume2: createIcon('Volume2'),
    VolumeX: createIcon('VolumeX'),
    Wifi: createIcon('Wifi'),
    WifiOff: createIcon('WifiOff'),
    Phone: createIcon('Phone'),
    MessageCircle: createIcon('MessageCircle'),
    Bell: createIcon('Bell'),
    BellOff: createIcon('BellOff'),
    HelpCircle: createIcon('HelpCircle'),
    Maximize: createIcon('Maximize'),
    Minimize: createIcon('Minimize'),
    RotateCcw: createIcon('RotateCcw'),
    RotateCw: createIcon('RotateCw'),
    Scissors: createIcon('Scissors'),
    PenTool: createIcon('PenTool'),
    Palette: createIcon('Palette'),
    Layers: createIcon('Layers'),
    Database: createIcon('Database'),
    Server: createIcon('Server'),
    Globe: createIcon('Globe'),
    Map: createIcon('Map'),
    MapPin: createIcon('MapPin'),
    Navigation: createIcon('Navigation'),
    Compass: createIcon('Compass'),
    Sun: createIcon('Sun'),
    Moon: createIcon('Moon'),
    CloudRain: createIcon('CloudRain'),
    Thermometer: createIcon('Thermometer'),
    Droplets: createIcon('Droplets'),
    Wind: createIcon('Wind'),
    Flame: createIcon('Flame'),
    Coffee: createIcon('Coffee'),
    Utensils: createIcon('Utensils'),
    ShoppingBag: createIcon('ShoppingBag'),
    Gift: createIcon('Gift'),
    Package: createIcon('Package'),
    Truck: createIcon('Truck'),
    Car: createIcon('Car'),
    Bike: createIcon('Bike'),
    Plane: createIcon('Plane'),
    Train: createIcon('Train'),
    Building: createIcon('Building'),
    Home2: createIcon('Home2'),
    Store: createIcon('Store'),
    Factory: createIcon('Factory'),
    School: createIcon('School'),
    Hospital: createIcon('Hospital'),
    Briefcase: createIcon('Briefcase'),
    Folder: createIcon('Folder'),
    FolderOpen: createIcon('FolderOpen'),
    File: createIcon('File'),
    FileImage: createIcon('FileImage'),
    FileVideo: createIcon('FileVideo'),
    FileAudio: createIcon('FileAudio'),
    FilePlus: createIcon('FilePlus'),
    FileMinus: createIcon('FileMinus'),
    FileCheck: createIcon('FileCheck'),
    FileX: createIcon('FileX'),
    Paperclip: createIcon('Paperclip'),
    Link: createIcon('Link'),
    Unlink: createIcon('Unlink'),
    Code: createIcon('Code'),
    Terminal: createIcon('Terminal'),
    Monitor: createIcon('Monitor'),
    Smartphone: createIcon('Smartphone'),
    Tablet: createIcon('Tablet'),
    Laptop: createIcon('Laptop'),
    Keyboard: createIcon('Keyboard'),
    Mouse: createIcon('Mouse'),
    Headphones: createIcon('Headphones'),
    Mic: createIcon('Mic'),
    MicOff: createIcon('MicOff'),
    Video: createIcon('Video'),
    VideoOff: createIcon('VideoOff'),
    Tv: createIcon('Tv'),
    Radio: createIcon('Radio'),
    Battery: createIcon('Battery'),
    BatteryLow: createIcon('BatteryLow'),
    Power: createIcon('Power'),
    PowerOff: createIcon('PowerOff'),
    Sliders: createIcon('Sliders'),
    ToggleLeft: createIcon('ToggleLeft'),
    ToggleRight: createIcon('ToggleRight'),
    Volume: createIcon('Volume'),
    Cpu: createIcon('Cpu'),
    HardDrive: createIcon('HardDrive'),
    MemoryStick: createIcon('MemoryStick'),
    Usb: createIcon('Usb'),
    Bluetooth: createIcon('Bluetooth'),
    Rss: createIcon('Rss'),
    Hash: createIcon('Hash'),
    AtSign: createIcon('AtSign'),
    Percent: createIcon('Percent'),
    DollarSign: createIcon('DollarSign'),
    PoundSterling: createIcon('PoundSterling'),
    Euro: createIcon('Euro'),
    Yen: createIcon('Yen'),
    CreditCard: createIcon('CreditCard'),
    Wallet: createIcon('Wallet'),
    Coins: createIcon('Coins'),
    Banknote: createIcon('Banknote'),
    Receipt: createIcon('Receipt'),
    Calculator: createIcon('Calculator'),
    TrendingDown: createIcon('TrendingDown'),
    PieChart: createIcon('PieChart'),
    LineChart: createIcon('LineChart'),
    BarChart2: createIcon('BarChart2'),
    BarChart3: createIcon('BarChart3'),
    BarChart4: createIcon('BarChart4'),
    Activity2: createIcon('Activity2'),
    Pulse: createIcon('Pulse'),
    Zap2: createIcon('Zap2'),
    Bolt: createIcon('Bolt'),
    Flashlight: createIcon('Flashlight'),
    LightBulb: createIcon('LightBulb'),
    Lamp: createIcon('Lamp'),
    Candle: createIcon('Candle'),
    TreePine: createIcon('TreePine'),
    Flower: createIcon('Flower'),
    Leaf: createIcon('Leaf'),
    Seedling: createIcon('Seedling'),
    Apple: createIcon('Apple'),
    Cherry: createIcon('Cherry'),
    Grape: createIcon('Grape'),
    Banana: createIcon('Banana'),
    Carrot: createIcon('Carrot'),
    Fish: createIcon('Fish'),
    Beef: createIcon('Beef'),
    Egg: createIcon('Egg'),
    Milk: createIcon('Milk'),
    Bread: createIcon('Bread'),
    Pizza: createIcon('Pizza'),
    IceCream: createIcon('IceCream'),
    Wine: createIcon('Wine'),
    Beer: createIcon('Beer'),
    Martini: createIcon('Martini'),
    GlassWater: createIcon('GlassWater'),
    CupSoda: createIcon('CupSoda'),
    Baby: createIcon('Baby'),
    Child: createIcon('Child'),
    Adult: createIcon('Adult'),
    Senior: createIcon('Senior'),
    Accessibility: createIcon('Accessibility'),
    Wheelchair: createIcon('Wheelchair'),
    Glasses: createIcon('Glasses'),
    Crown: createIcon('Crown'),
    Shield: createIcon('Shield'),
    ShieldCheck: createIcon('ShieldCheck'),
    ShieldAlert: createIcon('ShieldAlert'),
    ShieldX: createIcon('ShieldX'),
    Lock2: createIcon('Lock2'),
    Unlock: createIcon('Unlock'),
    Key: createIcon('Key'),
    KeyRound: createIcon('KeyRound'),
    Fingerprint: createIcon('Fingerprint'),
    Scan: createIcon('Scan'),
    QrCode: createIcon('QrCode'),
    Barcode: createIcon('Barcode'),
    ScanLine: createIcon('ScanLine'),
    ChefHat: createIcon('ChefHat'),
    Edit2: createIcon('Edit2'),
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

// Mock React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/admin', search: '', hash: '', state: null }),
    useParams: () => ({}),
    BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
    MemoryRouter: ({ children }: { children: React.ReactNode }) => children,
    Routes: ({ children }: { children: React.ReactNode }) => children,
    Route: ({ children }: { children: React.ReactNode }) => children,
    Link: ({ children, to, ...props }: any) => React.createElement('a', { href: to, ...props }, children),
    NavLink: ({ children, to, ...props }: any) => React.createElement('a', { href: to, ...props }, children),
  };
});

// AuthContext is mocked per-test in test-utils.tsx - no global mock needed

// Mock React Query/TanStack Query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn((options) => ({
      data: options.initialData || null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isSuccess: true,
    })),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: false,
      data: null,
    })),
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
      setQueryData: vi.fn(),
      getQueryData: vi.fn(),
      clear: vi.fn(),
    }),
    QueryClient: vi.fn().mockImplementation(() => ({
      invalidateQueries: vi.fn(),
      setQueryData: vi.fn(),
      getQueryData: vi.fn(),
      clear: vi.fn(),
    })),
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver  
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(() => 'mocked-object-url'),
  writable: true
});

// Mock URL.revokeObjectURL
Object.defineProperty(URL, 'revokeObjectURL', {
  value: vi.fn(),
  writable: true
});

// Add React act warning suppression and general error log suppression for tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: An update to') ||
       args[0].includes('Failed to fetch') ||
       args[0].includes('Error generating') ||
       args[0].includes('ZodError'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock database connection
vi.mock('../server/db', () => ({
  db: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    end: vi.fn().mockResolvedValue(undefined),
  },
  connectDB: vi.fn().mockResolvedValue(undefined),
  disconnectDB: vi.fn().mockResolvedValue(undefined),
}));

// Mock file system operations
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    writeFileSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue('{}'),
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
  };
});

// Mock path operations
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    join: vi.fn((...args) => args.join('/')),
    resolve: vi.fn((...args) => '/' + args.join('/')),
  };
});

// Mock process.env for consistent test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/fitmeal';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-that-is-long-enough-to-meet-minimum-requirements';
process.env.OPENAI_API_KEY = 'test-key';

// Mock UI components that are commonly missing
vi.mock('../client/src/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => 
    React.createElement('button', { onClick, ...props }, children),
}));

vi.mock('../client/src/components/ui/input', () => ({
  Input: (props: any) => React.createElement('input', props),
}));

vi.mock('../client/src/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'card', ...props }, children),
  CardContent: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'card-content', ...props }, children),
  CardHeader: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'card-header', ...props }, children),
  CardTitle: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'card-title', ...props }, children),
  CardDescription: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'card-description', ...props }, children),
}));

vi.mock('../client/src/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? React.createElement('div', { 'data-testid': 'dialog' }, children) : null,
  DialogContent: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'dialog-content', ...props }, children),
  DialogHeader: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'dialog-header', ...props }, children),
  DialogTitle: ({ children, ...props }: any) => React.createElement('h2', { 'data-testid': 'dialog-title', ...props }, children),
  DialogDescription: ({ children, ...props }: any) => React.createElement('p', { 'data-testid': 'dialog-description', ...props }, children),
  DialogTrigger: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'dialog-trigger', ...props }, children),
}));

vi.mock('../client/src/components/ui/tabs', () => ({
  Tabs: ({ children, value, defaultValue, onValueChange, ...props }: any) => {
    const activeValue = value || defaultValue || 'recipes';
    return React.createElement('div', { 
      'data-testid': 'tabs', 
      value: activeValue,
      ...props 
    }, children);
  },
  TabsList: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'tabs-list', role: 'tablist', ...props }, children),
  TabsTrigger: ({ children, value, onClick, ...props }: any) => {
    const handleClick = (e: any) => {
      // Update data-state for this trigger
      e.target.setAttribute('data-state', 'active');
      // Update siblings
      const siblings = e.target.parentNode?.querySelectorAll('[role="tab"]');
      siblings?.forEach((sibling: any) => {
        if (sibling !== e.target) {
          sibling.setAttribute('data-state', 'inactive');
        }
      });
      if (onClick) onClick(e);
    };
    
    return React.createElement('button', { 
      'data-testid': 'tabs-trigger', 
      'data-value': value,
      'data-state': value === 'recipes' ? 'active' : 'inactive', // Default to recipes active
      value: value,
      role: 'tab',
      onClick: handleClick,
      ...props 
    }, children);
  },
  TabsContent: ({ children, value, ...props }: any) => {
    // Simple approach: render all content but rely on component logic
    return React.createElement('div', { 
      'data-testid': 'tabs-content', 
      'data-value': value, 
      role: 'tabpanel', 
      ...props 
    }, children);
  },
}));

vi.mock('../client/src/components/ui/select', () => ({
  Select: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'select', ...props }, children),
  SelectContent: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'select-content', ...props }, children),
  SelectItem: ({ children, value, ...props }: any) => React.createElement('div', { 'data-testid': 'select-item', 'data-value': value, ...props }, children),
  SelectTrigger: ({ children, ...props }: any) => React.createElement('button', { 'data-testid': 'select-trigger', ...props }, children),
  SelectValue: ({ placeholder, ...props }: any) => React.createElement('span', { 'data-testid': 'select-value', ...props }, placeholder),
}));

vi.mock('../client/src/components/ui/textarea', () => ({
  Textarea: (props: any) => React.createElement('textarea', { 'data-testid': 'textarea', ...props }),
}));

vi.mock('../client/src/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => React.createElement('label', { 'data-testid': 'label', ...props }, children),
}));

vi.mock('../client/src/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => React.createElement('span', { 'data-testid': 'badge', ...props }, children),
}));

vi.mock('../client/src/components/ui/progress', () => ({
  Progress: ({ value, ...props }: any) => React.createElement('div', { 'data-testid': 'progress', 'data-value': value, ...props }),
}));

vi.mock('../client/src/components/ui/table', () => ({
  Table: ({ children, ...props }: any) => React.createElement('table', { 'data-testid': 'table', ...props }, children),
  TableBody: ({ children, ...props }: any) => React.createElement('tbody', { 'data-testid': 'table-body', ...props }, children),
  TableCell: ({ children, ...props }: any) => React.createElement('td', { 'data-testid': 'table-cell', ...props }, children),
  TableHead: ({ children, ...props }: any) => React.createElement('th', { 'data-testid': 'table-head', ...props }, children),
  TableHeader: ({ children, ...props }: any) => React.createElement('thead', { 'data-testid': 'table-header', ...props }, children),
  TableRow: ({ children, ...props }: any) => React.createElement('tr', { 'data-testid': 'table-row', ...props }, children),
}));

vi.mock('../client/src/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) =>
    React.createElement('input', {
      type: 'checkbox',
      checked,
      onChange: (e: any) => onCheckedChange?.(e.target.checked),
      'data-testid': 'checkbox',
      ...props
    }),
}));

vi.mock('../client/src/components/ui/radio-group', () => ({
  RadioGroup: ({ children, value, onValueChange, ...props }: any) =>
    React.createElement('div', {
      'data-testid': 'radio-group',
      'data-value': value,
      onChange: (e: any) => onValueChange?.(e.target.value),
      ...props
    }, children),
  RadioGroupItem: ({ value, id, ...props }: any) =>
    React.createElement('input', {
      type: 'radio',
      value,
      id,
      'data-testid': 'radio-group-item',
      ...props
    }),
}));

vi.mock('../client/src/components/ui/alert', () => ({
  Alert: ({ children, ...props }: any) =>
    React.createElement('div', {
      'data-testid': 'alert',
      role: 'alert',
      ...props
    }, children),
  AlertDescription: ({ children, ...props }: any) =>
    React.createElement('div', {
      'data-testid': 'alert-description',
      ...props
    }, children),
}));

// Mock API client
vi.mock('../client/src/lib/queryClient', () => ({
  apiRequest: vi.fn().mockResolvedValue({}),
  queryClient: {
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
  },
}));