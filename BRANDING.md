# EvoFitMeals Brand Guidelines & Design System

## Table of Contents
1. [Brand Identity](#brand-identity)
2. [Logo & Visual Identity](#logo--visual-identity)
3. [Color Palette](#color-palette)
4. [Typography](#typography)
5. [Spacing & Layout](#spacing--layout)
6. [UI Components](#ui-components)
7. [Icons & Imagery](#icons--imagery)
8. [Animation & Interactions](#animation--interactions)
9. [Responsive Design](#responsive-design)
10. [Code Standards](#code-standards)

---

## Brand Identity

### Brand Name
**EvoFitMeals** (formerly FitnessMealPlanner)

### Brand Mission
Transform the way fitness professionals deliver nutrition coaching through AI-powered meal planning technology.

### Brand Values
- **Professional** - Enterprise-grade tools for serious fitness professionals
- **Intelligent** - AI-driven solutions that save time and improve outcomes
- **Accessible** - Intuitive interface that works for everyone
- **Reliable** - 99.9% uptime with bank-level security
- **Growth-Focused** - Tools that scale with your business

### Brand Voice
- Professional yet approachable
- Confident without being arrogant
- Tech-savvy but accessible
- Results-focused with empathy
- Clear and concise

---

## Logo & Visual Identity

### Primary Logo
```
🍴 EvoFitMeals
```
- **Icon**: Fork and knife (Font Awesome: `fa-utensils`)
- **Color**: Purple (#9333EA or hsl(271, 91%, 56%))
- **Font**: Bold, modern sans-serif
- **Usage**: Always display icon with brand name

### Logo Variations
```html
<!-- Standard Logo -->
<div class="flex items-center">
  <i class="fas fa-utensils text-purple-600 text-2xl mr-2"></i>
  <span class="text-2xl font-bold gradient-text">EvoFitMeals</span>
</div>

<!-- Small Logo -->
<div class="flex items-center">
  <i class="fas fa-utensils text-purple-600 text-lg mr-1"></i>
  <span class="text-lg font-semibold">EvoFitMeals</span>
</div>

<!-- Icon Only (Mobile) -->
<i class="fas fa-utensils text-purple-600 text-3xl"></i>
```

### Gradient Text Effect
```css
.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## Color Palette

### Primary Colors

#### Brand Purple
- **Primary**: `#9333EA` / `hsl(271, 91%, 56%)`
- **Light**: `#A855F7` / `hsl(271, 91%, 65%)`
- **Dark**: `#7E22CE` / `hsl(271, 91%, 47%)`
- **Usage**: Primary actions, links, brand elements

#### Success Green (App Primary)
- **Primary**: `hsl(158, 64.4%, 51.6%)` / `#3CDBB1`
- **Light**: `hsl(158, 64%, 60%)`
- **Dark**: `hsl(158, 64%, 40%)`
- **Usage**: Success states, positive actions, confirmations

#### Warning Yellow
- **Primary**: `hsl(43, 89.8%, 48.6%)` / `#F5C842`
- **Light**: `hsl(43, 90%, 60%)`
- **Dark**: `hsl(43, 90%, 40%)`
- **Usage**: Warnings, important notices

### Semantic Colors

```css
:root {
  /* Light Mode */
  --background: hsl(0, 0%, 100%);           /* #FFFFFF */
  --foreground: hsl(20, 14.3%, 4.1%);      /* #0F0E0B */
  --muted: hsl(60, 4.8%, 95.9%);           /* #F5F5F4 */
  --muted-foreground: hsl(25, 5.3%, 44.7%); /* #756E6B */
  --border: hsl(20, 5.9%, 90%);            /* #E6E3E1 */
  --input: hsl(20, 5.9%, 90%);             /* #E6E3E1 */

  /* Actions */
  --primary: hsl(158, 64.4%, 51.6%);       /* Success Green */
  --secondary: hsl(43, 89.8%, 48.6%);      /* Warning Yellow */
  --destructive: hsl(0, 84.2%, 60.2%);     /* #EF4444 */

  /* Cards & Modals */
  --card: hsl(0, 0%, 100%);
  --popover: hsl(0, 0%, 100%);

  /* Interactive */
  --ring: hsl(20, 14.3%, 4.1%);
  --radius: 0.5rem;
}

/* Dark Mode */
.dark {
  --background: hsl(240, 10%, 3.9%);       /* #09090B */
  --foreground: hsl(0, 0%, 98%);           /* #FAFAFA */
  --muted: hsl(240, 3.7%, 15.9%);         /* #27272A */
  --muted-foreground: hsl(240, 5%, 64.9%); /* #A1A1AA */
  --border: hsl(240, 3.7%, 15.9%);        /* #27272A */
}
```

### Gradient Schemes

```css
/* Hero Gradient (Landing Page) */
.hero-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Feature Gradient */
.feature-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Success Gradient */
.success-gradient {
  background: linear-gradient(135deg, #3CDBB1 0%, #2EBF91 100%);
}
```

---

## Typography

### Font Stack
```css
font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Type Scale

#### Headings
```css
/* Display */
.text-display {
  font-size: 3.5rem;      /* 56px */
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.02em;
}

/* H1 */
.text-h1 {
  font-size: 2.5rem;      /* 40px */
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.01em;
}

/* H2 */
.text-h2 {
  font-size: 2rem;        /* 32px */
  line-height: 1.3;
  font-weight: 600;
}

/* H3 */
.text-h3 {
  font-size: 1.5rem;      /* 24px */
  line-height: 1.4;
  font-weight: 600;
}

/* H4 */
.text-h4 {
  font-size: 1.25rem;     /* 20px */
  line-height: 1.5;
  font-weight: 500;
}
```

#### Body Text
```css
/* Large */
.text-lg {
  font-size: 1.125rem;    /* 18px */
  line-height: 1.75;
}

/* Base */
.text-base {
  font-size: 1rem;        /* 16px */
  line-height: 1.6;
}

/* Small */
.text-sm {
  font-size: 0.875rem;    /* 14px */
  line-height: 1.5;
}

/* Extra Small */
.text-xs {
  font-size: 0.75rem;     /* 12px */
  line-height: 1.4;
}
```

### Font Weights
- **Thin**: 100
- **Light**: 300
- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700
- **Extra Bold**: 800

---

## Spacing & Layout

### Spacing Scale
```css
/* Base unit: 4px */
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-5: 1.25rem;    /* 20px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */
```

### Container Widths
```css
.container {
  max-width: 1280px;     /* Standard container */
}

.container-sm {
  max-width: 640px;      /* Small container */
}

.container-lg {
  max-width: 1536px;     /* Large container */
}
```

### Grid System
```css
/* 12-column grid */
.grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }

/* Responsive grid */
@media (min-width: 640px) { .sm\:grid-cols-2 }
@media (min-width: 768px) { .md\:grid-cols-3 }
@media (min-width: 1024px) { .lg\:grid-cols-4 }
```

### Border Radius
```css
--radius-sm: 0.125rem;   /* 2px */
--radius: 0.5rem;        /* 8px - Default */
--radius-md: 0.75rem;    /* 12px */
--radius-lg: 1rem;       /* 16px */
--radius-xl: 1.5rem;     /* 24px */
--radius-full: 9999px;   /* Pill shape */
```

---

## UI Components

### Buttons

#### Primary Button
```html
<button class="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-all duration-200 active:scale-95">
  Get Started
</button>
```

#### Secondary Button
```html
<button class="bg-white border-2 border-purple-600 text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-all duration-200">
  Learn More
</button>
```

#### Success Button (App)
```html
<button class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition">
  Save Changes
</button>
```

#### Destructive Button
```html
<button class="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition">
  Delete
</button>
```

#### Button Sizes
- **Small**: `px-3 py-1.5 text-sm`
- **Medium**: `px-4 py-2 text-base` (default)
- **Large**: `px-6 py-3 text-lg`

### Cards

#### Standard Card
```html
<div class="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
  <!-- Card content -->
</div>
```

#### Hover Effect Card
```html
<div class="card-hover bg-white rounded-xl p-8 border border-gray-100">
  <!-- Card content -->
</div>

<style>
.card-hover {
  transition: all 0.3s ease;
}
.card-hover:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}
</style>
```

### Forms

#### Input Field
```html
<div class="mb-4">
  <label class="block text-sm font-medium text-gray-700 mb-2">
    Email Address
  </label>
  <input type="email"
         class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
</div>
```

#### Select Dropdown
```html
<select class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

#### Checkbox
```html
<label class="flex items-center">
  <input type="checkbox" class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500">
  <span class="ml-2 text-gray-700">Remember me</span>
</label>
```

### Navigation

#### Top Navigation Bar
```html
<nav class="fixed w-full bg-white shadow-sm z-50">
  <div class="container mx-auto px-4 py-4">
    <div class="flex justify-between items-center">
      <!-- Logo -->
      <div class="flex items-center">
        <i class="fas fa-utensils text-purple-600 text-2xl mr-2"></i>
        <span class="text-2xl font-bold gradient-text">EvoFitMeals</span>
      </div>

      <!-- Nav Links -->
      <div class="hidden md:flex space-x-8">
        <a href="#" class="text-gray-600 hover:text-gray-900">Features</a>
        <a href="#" class="text-gray-600 hover:text-gray-900">Pricing</a>
      </div>

      <!-- CTA -->
      <button class="bg-purple-600 text-white px-6 py-2 rounded-lg">
        Sign Up
      </button>
    </div>
  </div>
</nav>
```

#### Mobile Navigation (App)
```html
<nav class="mobile-nav">
  <button class="mobile-nav-item active">
    <i class="fas fa-home"></i>
    <span class="text-xs mt-1">Home</span>
  </button>
  <button class="mobile-nav-item">
    <i class="fas fa-utensils"></i>
    <span class="text-xs mt-1">Recipes</span>
  </button>
  <!-- More items -->
</nav>
```

### Modals

#### Standard Modal
```html
<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
    <h2 class="text-2xl font-bold mb-4">Modal Title</h2>
    <p class="text-gray-600 mb-6">Modal content goes here...</p>
    <div class="flex justify-end space-x-3">
      <button class="px-4 py-2 text-gray-600 hover:text-gray-900">Cancel</button>
      <button class="bg-purple-600 text-white px-4 py-2 rounded-lg">Confirm</button>
    </div>
  </div>
</div>
```

### Tables

#### Responsive Table
```html
<div class="table-container overflow-x-auto">
  <table class="min-w-full">
    <thead class="bg-gray-50 border-b">
      <tr>
        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Name
        </th>
        <!-- More headers -->
      </tr>
    </thead>
    <tbody class="bg-white divide-y divide-gray-200">
      <tr>
        <td class="px-6 py-4 whitespace-nowrap">
          <!-- Content -->
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Badges

```html
<!-- Success Badge -->
<span class="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
  Active
</span>

<!-- Warning Badge -->
<span class="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">
  Pending
</span>

<!-- Info Badge -->
<span class="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
  New
</span>
```

### Loading States

#### Skeleton Loader
```html
<div class="animate-pulse">
  <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
  <div class="h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```

#### Spinner
```html
<div class="flex justify-center items-center">
  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
</div>
```

---

## Icons & Imagery

### Icon Library
**Font Awesome 6.4.0** - Primary icon library

### Common Icons
```
Navigation:
- Home: fa-home
- Menu: fa-bars
- Close: fa-times
- User: fa-user
- Settings: fa-cog

Actions:
- Add: fa-plus
- Edit: fa-edit
- Delete: fa-trash
- Save: fa-save
- Download: fa-download
- Share: fa-share

Food/Nutrition:
- Utensils: fa-utensils (Brand icon)
- Apple: fa-apple-whole
- Carrot: fa-carrot
- Fish: fa-fish
- Dumbbell: fa-dumbbell

Status:
- Check: fa-check
- Warning: fa-exclamation-triangle
- Info: fa-info-circle
- Error: fa-times-circle
```

### Image Guidelines

#### Recipe Images
- **Aspect Ratio**: 16:9 or 4:3
- **Minimum Resolution**: 800x600px
- **Format**: WebP preferred, JPEG fallback
- **Optimization**: Lazy loading, progressive enhancement

```html
<img src="/api/images/recipe.webp"
     alt="Recipe name"
     class="w-full h-48 object-cover rounded-lg"
     loading="lazy">
```

#### Profile Images
- **Aspect Ratio**: 1:1 (Square)
- **Size**: 200x200px minimum
- **Format**: JPEG or PNG
- **Shape**: Circular display

```html
<img src="/api/images/profile.jpg"
     alt="User name"
     class="w-12 h-12 rounded-full object-cover">
```

---

## Animation & Interactions

### Transition Timing
```css
/* Standard transitions */
.transition { transition: all 0.2s ease; }
.transition-colors { transition: colors 0.2s ease; }
.transition-transform { transition: transform 0.2s ease; }
.transition-shadow { transition: box-shadow 0.3s ease; }
```

### Hover Effects
```css
/* Button hover */
.hover\:bg-purple-700:hover { background: #7E22CE; }

/* Scale on hover */
.hover\:scale-105:hover { transform: scale(1.05); }

/* Shadow on hover */
.hover\:shadow-lg:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}
```

### Click Feedback
```css
/* Active scale */
.active\:scale-95:active { transform: scale(0.95); }

/* Ripple effect for mobile */
@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

.ripple-effect {
  animation: ripple 0.6s ease-out;
}
```

### Loading Animations
```css
/* Pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.animate-pulse { animation: pulse 2s infinite; }

/* Spin */
@keyframes spin {
  to { transform: rotate(360deg); }
}
.animate-spin { animation: spin 1s linear infinite; }

/* Shimmer */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.animate-shimmer { animation: shimmer 2s infinite; }
```

---

## Responsive Design

### Breakpoints
```css
xs: 480px   /* Extra small devices */
sm: 640px   /* Small devices */
md: 768px   /* Tablets */
lg: 1024px  /* Desktops */
xl: 1280px  /* Large desktops */
2xl: 1536px /* Extra large screens */
```

### Mobile-First Approach
```css
/* Base (Mobile) */
.text-base { font-size: 14px; }

/* Tablet and up */
@media (min-width: 768px) {
  .md\:text-base { font-size: 16px; }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .lg\:text-lg { font-size: 18px; }
}
```

### Responsive Utilities

#### Hide/Show Elements
```html
<!-- Hide on mobile, show on desktop -->
<div class="hidden lg:block">Desktop only</div>

<!-- Show on mobile, hide on desktop -->
<div class="block lg:hidden">Mobile only</div>
```

#### Responsive Grid
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- Grid items -->
</div>
```

#### Responsive Padding
```html
<div class="p-4 md:p-6 lg:p-8">
  <!-- Content with responsive padding -->
</div>
```

### Touch Targets
- **Minimum Size**: 44x44px (iOS) / 48x48px (Android)
- **Spacing**: 8px minimum between targets
- **Visual Feedback**: Active states for all interactive elements

---

## Code Standards

### Component Structure
```tsx
// React Component Template
import React from 'react';
import { cn } from '@/utils/cn';

interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export function Component({ className, children }: ComponentProps) {
  return (
    <div className={cn(
      "base-classes-here",
      className
    )}>
      {children}
    </div>
  );
}
```

### CSS Class Organization
```html
<!-- Order: Layout → Box Model → Typography → Visual → Animation -->
<div class="
  flex items-center justify-between
  p-4 m-2
  text-lg font-semibold
  bg-white border border-gray-200 rounded-lg shadow-sm
  transition-all hover:shadow-md
">
```

### Naming Conventions

#### CSS Classes
- **Utility-first**: Use Tailwind classes primarily
- **Custom classes**: kebab-case (e.g., `mobile-nav-item`)
- **Component classes**: PascalCase for React components

#### File Naming
- **Components**: PascalCase (e.g., `RecipeCard.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Styles**: kebab-case (e.g., `landing-page.css`)

### Accessibility Standards
- **ARIA Labels**: All interactive elements
- **Alt Text**: All images
- **Focus States**: Visible keyboard navigation
- **Color Contrast**: WCAG AA minimum (4.5:1)
- **Semantic HTML**: Proper heading hierarchy

```html
<!-- Accessible button example -->
<button
  aria-label="Save recipe"
  class="... focus:outline-none focus:ring-2 focus:ring-purple-500"
  role="button"
  tabindex="0"
>
  <i class="fas fa-save" aria-hidden="true"></i>
  <span>Save</span>
</button>
```

### Performance Guidelines
- **Lazy Loading**: Images and heavy components
- **Code Splitting**: Route-based splitting
- **Image Optimization**: WebP with fallbacks
- **Bundle Size**: < 200KB initial JS
- **Font Loading**: Font-display: swap

---

## Implementation Checklist

### For New Features
- [ ] Follow color palette and typography
- [ ] Use existing UI components
- [ ] Ensure mobile responsiveness
- [ ] Add loading states
- [ ] Include error states
- [ ] Test touch targets on mobile
- [ ] Verify accessibility standards
- [ ] Add proper animations
- [ ] Use consistent spacing

### For Landing Pages
- [ ] Include brand logo with icon
- [ ] Use gradient text for brand name
- [ ] Apply hero gradient to main sections
- [ ] Add hover effects to cards
- [ ] Include pulse animation on CTAs
- [ ] Ensure smooth scroll behavior
- [ ] Add proper meta tags
- [ ] Optimize images

### For App Pages
- [ ] Use success green for primary actions
- [ ] Include mobile navigation for small screens
- [ ] Add skeleton loaders for data fetching
- [ ] Implement table horizontal scroll
- [ ] Use proper form field styling
- [ ] Add ripple effects for mobile touches
- [ ] Include proper error boundaries
- [ ] Test on multiple viewports

---

## Version History
- **v1.0.0** (2025-01-17): Initial brand guidelines documentation
- Created by: CTO AI Assistant
- Based on: EvoFitMeals production website and application

---

*This document serves as the single source of truth for all design and development decisions for the EvoFitMeals platform.*