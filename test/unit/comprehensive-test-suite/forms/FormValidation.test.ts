import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// Mock form validation schemas and utilities
const validationSchemas = {
  // Authentication schemas
  loginSchema: z.object({
    email: z.string()
      .min(1, { message: 'Email is required' })
      .email({ message: 'Please enter a valid email address' })
      .toLowerCase()
      .trim(),
    password: z.string()
      .min(1, { message: 'Password is required' })
      .min(6, { message: 'Password must be at least 6 characters' }),
  }),

  registerSchema: z.object({
    email: z.string()
      .min(1, { message: 'Email is required' })
      .email({ message: 'Please enter a valid email address' })
      .toLowerCase()
      .trim(),
    password: z.string()
      .min(8, { message: 'Password must be at least 8 characters' })
      .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
      .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
      .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
    confirmPassword: z.string(),
    role: z.enum(['customer', 'trainer'], { message: 'Role is required' }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),

  // Profile schemas
  customerProfileSchema: z.object({
    weight: z.number()
      .min(30, { message: 'Weight must be at least 30 kg' })
      .max(500, { message: 'Weight must be less than 500 kg' })
      .optional(),
    height: z.number()
      .min(100, { message: 'Height must be at least 100 cm' })
      .max(250, { message: 'Height must be less than 250 cm' })
      .optional(),
    age: z.number()
      .min(13, { message: 'Age must be at least 13 years' })
      .max(120, { message: 'Age must be less than 120 years' })
      .optional(),
    bio: z.string()
      .max(500, { message: 'Bio must be less than 500 characters' })
      .optional(),
    fitnessGoals: z.array(z.string()).optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very-active']).optional(),
  }),

  // Recipe schemas
  recipeSchema: z.object({
    title: z.string()
      .min(1, { message: 'Recipe title is required' })
      .max(100, { message: 'Title must be less than 100 characters' }),
    description: z.string()
      .min(10, { message: 'Description must be at least 10 characters' })
      .max(500, { message: 'Description must be less than 500 characters' }),
    prepTime: z.number()
      .min(1, { message: 'Prep time must be at least 1 minute' })
      .max(480, { message: 'Prep time must be less than 8 hours' }),
    cookTime: z.number()
      .min(0, { message: 'Cook time cannot be negative' })
      .max(1440, { message: 'Cook time must be less than 24 hours' })
      .optional(),
    servings: z.number()
      .min(1, { message: 'Must serve at least 1 person' })
      .max(20, { message: 'Cannot serve more than 20 people' }),
    calories: z.number()
      .min(1, { message: 'Calories must be at least 1' })
      .max(5000, { message: 'Calories must be less than 5000' }),
    ingredients: z.array(z.object({
      name: z.string().min(1, { message: 'Ingredient name is required' }),
      amount: z.string().min(1, { message: 'Amount is required' }),
      unit: z.string().min(1, { message: 'Unit is required' }),
    })).min(1, { message: 'At least one ingredient is required' }),
    instructions: z.array(z.string().min(1))
      .min(1, { message: 'At least one instruction is required' }),
    cuisine: z.string().optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  }),

  // Meal plan schemas
  mealPlanSchema: z.object({
    title: z.string()
      .min(1, { message: 'Plan title is required' })
      .max(100, { message: 'Title must be less than 100 characters' }),
    description: z.string()
      .max(500, { message: 'Description must be less than 500 characters' })
      .optional(),
    startDate: z.string()
      .min(1, { message: 'Start date is required' })
      .refine((date) => {
        const startDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return startDate >= today;
      }, { message: 'Start date cannot be in the past' }),
    duration: z.number()
      .min(1, { message: 'Duration must be at least 1 day' })
      .max(30, { message: 'Duration must be 30 days or less' }),
    mealsPerDay: z.number()
      .min(1, { message: 'Must have at least 1 meal per day' })
      .max(6, { message: 'Cannot have more than 6 meals per day' }),
    targetCalories: z.number()
      .min(1200, { message: 'Target calories must be at least 1200' })
      .max(4000, { message: 'Target calories must be less than 4000' }),
    dietaryRestrictions: z.array(z.string()).optional(),
    cuisinePreferences: z.array(z.string()).optional(),
  }),

  // Measurement schemas
  measurementSchema: z.object({
    measurementDate: z.string()
      .min(1, { message: 'Measurement date is required' })
      .refine((date) => {
        const measurementDate = new Date(date);
        const today = new Date();
        return measurementDate <= today;
      }, { message: 'Measurement date cannot be in the future' }),
    weightKg: z.string()
      .optional()
      .refine((weight) => {
        if (!weight) return true;
        const num = parseFloat(weight);
        return !isNaN(num) && num >= 30 && num <= 500;
      }, { message: 'Weight must be between 30 and 500 kg' }),
    bodyFatPercentage: z.string()
      .optional()
      .refine((fat) => {
        if (!fat) return true;
        const num = parseFloat(fat);
        return !isNaN(num) && num >= 1 && num <= 50;
      }, { message: 'Body fat percentage must be between 1 and 50%' }),
    notes: z.string()
      .max(500, { message: 'Notes must be less than 500 characters' })
      .optional(),
  }),
};

// Validation utility functions
const validationUtils = {
  validateEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  validatePassword: (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  validateDateRange: (startDate: string, endDate: string): boolean => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= end;
  },

  validateNumericRange: (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max;
  },

  sanitizeInput: (input: string): string => {
    return input.trim().replace(/[<>]/g, '');
  },

  validateFileUpload: (file: File, allowedTypes: string[], maxSizeMB: number): { isValid: boolean; error?: string } => {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        isValid: false,
        error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${maxSizeMB}MB`
      };
    }

    return { isValid: true };
  },
};

describe('Form Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Validation', () => {
    describe('Login Schema', () => {
      it('validates valid login credentials', () => {
        const validData = {
          email: 'test@example.com',
          password: 'password123',
        };

        const result = validationSchemas.loginSchema.safeParse(validData);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe('test@example.com');
          expect(result.data.password).toBe('password123');
        }
      });

      it('validates and normalizes email', () => {
        const dataWithCaseAndSpaces = {
          email: '  TEST@EXAMPLE.COM  ',
          password: 'password123',
        };

        const result = validationSchemas.loginSchema.safeParse(dataWithCaseAndSpaces);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe('test@example.com');
        }
      });

      it('rejects invalid email format', () => {
        const invalidData = {
          email: 'invalid-email',
          password: 'password123',
        };

        const result = validationSchemas.loginSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Please enter a valid email address');
        }
      });

      it('rejects empty email', () => {
        const invalidData = {
          email: '',
          password: 'password123',
        };

        const result = validationSchemas.loginSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Email is required');
        }
      });

      it('rejects short password', () => {
        const invalidData = {
          email: 'test@example.com',
          password: '123',
        };

        const result = validationSchemas.loginSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Password must be at least 6 characters');
        }
      });

      it('rejects empty password', () => {
        const invalidData = {
          email: 'test@example.com',
          password: '',
        };

        const result = validationSchemas.loginSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Password is required');
        }
      });
    });

    describe('Registration Schema', () => {
      it('validates valid registration data', () => {
        const validData = {
          email: 'test@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
          role: 'customer' as const,
        };

        const result = validationSchemas.registerSchema.safeParse(validData);
        
        expect(result.success).toBe(true);
      });

      it('rejects password without uppercase letter', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          role: 'customer' as const,
        };

        const result = validationSchemas.registerSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          const error = result.error.errors.find(e => 
            e.message.includes('uppercase letter')
          );
          expect(error).toBeDefined();
        }
      });

      it('rejects password without lowercase letter', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'PASSWORD123',
          confirmPassword: 'PASSWORD123',
          role: 'customer' as const,
        };

        const result = validationSchemas.registerSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          const error = result.error.errors.find(e => 
            e.message.includes('lowercase letter')
          );
          expect(error).toBeDefined();
        }
      });

      it('rejects password without number', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'Password',
          confirmPassword: 'Password',
          role: 'customer' as const,
        };

        const result = validationSchemas.registerSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          const error = result.error.errors.find(e => 
            e.message.includes('number')
          );
          expect(error).toBeDefined();
        }
      });

      it('rejects mismatched passwords', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'Password123',
          confirmPassword: 'DifferentPassword123',
          role: 'customer' as const,
        };

        const result = validationSchemas.registerSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          const error = result.error.errors.find(e => 
            e.message.includes('Passwords do not match')
          );
          expect(error).toBeDefined();
          expect(error?.path).toEqual(['confirmPassword']);
        }
      });

      it('rejects invalid role', () => {
        const invalidData = {
          email: 'test@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
          role: 'invalid-role' as any,
        };

        const result = validationSchemas.registerSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Role is required');
        }
      });
    });
  });

  describe('Profile Validation', () => {
    describe('Customer Profile Schema', () => {
      it('validates valid profile data', () => {
        const validData = {
          weight: 70,
          height: 175,
          age: 30,
          bio: 'Fitness enthusiast',
          fitnessGoals: ['weight_loss', 'muscle_gain'],
          dietaryRestrictions: ['vegetarian'],
          activityLevel: 'moderate' as const,
        };

        const result = validationSchemas.customerProfileSchema.safeParse(validData);
        
        expect(result.success).toBe(true);
      });

      it('allows empty optional fields', () => {
        const minimalData = {};

        const result = validationSchemas.customerProfileSchema.safeParse(minimalData);
        
        expect(result.success).toBe(true);
      });

      it('rejects weight outside valid range', () => {
        const invalidData = { weight: 25 }; // Too low

        const result = validationSchemas.customerProfileSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Weight must be at least 30 kg');
        }
      });

      it('rejects height outside valid range', () => {
        const invalidData = { height: 300 }; // Too high

        const result = validationSchemas.customerProfileSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Height must be less than 250 cm');
        }
      });

      it('rejects age outside valid range', () => {
        const invalidData = { age: 10 }; // Too young

        const result = validationSchemas.customerProfileSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Age must be at least 13 years');
        }
      });

      it('rejects bio that is too long', () => {
        const invalidData = { 
          bio: 'A'.repeat(501) // Too long
        };

        const result = validationSchemas.customerProfileSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Bio must be less than 500 characters');
        }
      });

      it('rejects invalid activity level', () => {
        const invalidData = { 
          activityLevel: 'super-active' as any
        };

        const result = validationSchemas.customerProfileSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].code).toBe('invalid_enum_value');
        }
      });
    });
  });

  describe('Recipe Validation', () => {
    describe('Recipe Schema', () => {
      it('validates complete recipe data', () => {
        const validData = {
          title: 'Grilled Chicken Salad',
          description: 'A delicious and healthy protein-packed salad',
          prepTime: 20,
          cookTime: 15,
          servings: 2,
          calories: 350,
          ingredients: [
            { name: 'Chicken breast', amount: '200', unit: 'g' },
            { name: 'Mixed greens', amount: '100', unit: 'g' },
          ],
          instructions: [
            'Season and grill the chicken breast',
            'Prepare the salad greens',
          ],
          cuisine: 'Mediterranean',
          dietaryRestrictions: ['gluten-free'],
          difficulty: 'easy' as const,
        };

        const result = validationSchemas.recipeSchema.safeParse(validData);
        
        expect(result.success).toBe(true);
      });

      it('rejects recipe without required fields', () => {
        const invalidData = {
          // Missing title
          description: 'A recipe description',
        };

        const result = validationSchemas.recipeSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          const titleError = result.error.errors.find(e => 
            e.path.includes('title')
          );
          expect(titleError?.message).toBe('Recipe title is required');
        }
      });

      it('rejects recipe with empty ingredients', () => {
        const invalidData = {
          title: 'Test Recipe',
          description: 'A test recipe description',
          prepTime: 20,
          servings: 2,
          calories: 350,
          ingredients: [], // Empty array
          instructions: ['Mix ingredients'],
        };

        const result = validationSchemas.recipeSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('At least one ingredient is required');
        }
      });

      it('rejects recipe with invalid prep time', () => {
        const invalidData = {
          title: 'Test Recipe',
          description: 'A test recipe description',
          prepTime: 0, // Invalid
          servings: 2,
          calories: 350,
          ingredients: [
            { name: 'Ingredient', amount: '100', unit: 'g' },
          ],
          instructions: ['Mix ingredients'],
        };

        const result = validationSchemas.recipeSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Prep time must be at least 1 minute');
        }
      });

      it('rejects recipe with invalid calories', () => {
        const invalidData = {
          title: 'Test Recipe',
          description: 'A test recipe description',
          prepTime: 20,
          servings: 2,
          calories: 6000, // Too high
          ingredients: [
            { name: 'Ingredient', amount: '100', unit: 'g' },
          ],
          instructions: ['Mix ingredients'],
        };

        const result = validationSchemas.recipeSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Calories must be less than 5000');
        }
      });

      it('validates ingredients structure', () => {
        const invalidData = {
          title: 'Test Recipe',
          description: 'A test recipe description',
          prepTime: 20,
          servings: 2,
          calories: 350,
          ingredients: [
            { name: '', amount: '100', unit: 'g' }, // Empty name
          ],
          instructions: ['Mix ingredients'],
        };

        const result = validationSchemas.recipeSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Ingredient name is required');
        }
      });
    });
  });

  describe('Meal Plan Validation', () => {
    beforeEach(() => {
      // Mock current date for consistent testing
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    describe('Meal Plan Schema', () => {
      it('validates valid meal plan data', () => {
        const validData = {
          title: 'Weekly Meal Plan',
          description: 'A healthy meal plan for the week',
          startDate: '2024-01-20',
          duration: 7,
          mealsPerDay: 3,
          targetCalories: 2000,
          dietaryRestrictions: ['vegetarian'],
          cuisinePreferences: ['mediterranean'],
        };

        const result = validationSchemas.mealPlanSchema.safeParse(validData);
        
        expect(result.success).toBe(true);
      });

      it('rejects start date in the past', () => {
        const invalidData = {
          title: 'Test Plan',
          startDate: '2024-01-10', // Past date
          duration: 7,
          mealsPerDay: 3,
          targetCalories: 2000,
        };

        const result = validationSchemas.mealPlanSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Start date cannot be in the past');
        }
      });

      it('rejects invalid duration', () => {
        const invalidData = {
          title: 'Test Plan',
          startDate: '2024-01-20',
          duration: 35, // Too long
          mealsPerDay: 3,
          targetCalories: 2000,
        };

        const result = validationSchemas.mealPlanSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Duration must be 30 days or less');
        }
      });

      it('rejects invalid target calories', () => {
        const invalidData = {
          title: 'Test Plan',
          startDate: '2024-01-20',
          duration: 7,
          mealsPerDay: 3,
          targetCalories: 800, // Too low
        };

        const result = validationSchemas.mealPlanSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe('Target calories must be at least 1200');
        }
      });
    });
  });

  describe('Utility Functions', () => {
    describe('validateEmail', () => {
      it('validates correct email formats', () => {
        expect(validationUtils.validateEmail('test@example.com')).toBe(true);
        expect(validationUtils.validateEmail('user.name@domain.co.uk')).toBe(true);
        expect(validationUtils.validateEmail('test+label@example.org')).toBe(true);
      });

      it('rejects invalid email formats', () => {
        expect(validationUtils.validateEmail('invalid-email')).toBe(false);
        expect(validationUtils.validateEmail('test@')).toBe(false);
        expect(validationUtils.validateEmail('@domain.com')).toBe(false);
        expect(validationUtils.validateEmail('test.domain.com')).toBe(false);
      });
    });

    describe('validatePassword', () => {
      it('validates strong passwords', () => {
        const result = validationUtils.validatePassword('StrongPass123');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('identifies multiple password weaknesses', () => {
        const result = validationUtils.validatePassword('weak');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters');
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
        expect(result.errors).toContain('Password must contain at least one number');
      });

      it('validates password with all requirements', () => {
        const result = validationUtils.validatePassword('MySecure123Password');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('validateDateRange', () => {
      it('validates correct date ranges', () => {
        expect(validationUtils.validateDateRange('2024-01-15', '2024-01-20')).toBe(true);
        expect(validationUtils.validateDateRange('2024-01-15', '2024-01-15')).toBe(true); // Same date
      });

      it('rejects invalid date ranges', () => {
        expect(validationUtils.validateDateRange('2024-01-20', '2024-01-15')).toBe(false);
      });
    });

    describe('validateNumericRange', () => {
      it('validates numbers within range', () => {
        expect(validationUtils.validateNumericRange(50, 0, 100)).toBe(true);
        expect(validationUtils.validateNumericRange(0, 0, 100)).toBe(true); // Min boundary
        expect(validationUtils.validateNumericRange(100, 0, 100)).toBe(true); // Max boundary
      });

      it('rejects numbers outside range', () => {
        expect(validationUtils.validateNumericRange(-1, 0, 100)).toBe(false);
        expect(validationUtils.validateNumericRange(101, 0, 100)).toBe(false);
      });
    });

    describe('sanitizeInput', () => {
      it('removes dangerous characters', () => {
        expect(validationUtils.sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
        expect(validationUtils.sanitizeInput('Normal text')).toBe('Normal text');
      });

      it('trims whitespace', () => {
        expect(validationUtils.sanitizeInput('  text with spaces  ')).toBe('text with spaces');
      });
    });

    describe('validateFileUpload', () => {
      it('validates allowed file types and sizes', () => {
        const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
        Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1MB

        const result = validationUtils.validateFileUpload(validFile, ['image/jpeg', 'image/png'], 5);
        
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('rejects invalid file types', () => {
        const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });

        const result = validationUtils.validateFileUpload(invalidFile, ['image/jpeg', 'image/png'], 5);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('File type text/plain is not allowed');
      });

      it('rejects files that are too large', () => {
        const largeFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
        Object.defineProperty(largeFile, 'size', { value: 10 * 1024 * 1024 }); // 10MB

        const result = validationUtils.validateFileUpload(largeFile, ['image/jpeg'], 5);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('File size 10.00MB exceeds maximum 5MB');
      });
    });
  });
});