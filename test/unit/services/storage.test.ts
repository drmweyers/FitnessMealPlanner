import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatabaseStorage, type IStorage } from '../../../server/storage';
import { db } from '../../../server/db';
import {
  users,
  recipes,
  personalizedRecipes,
  personalizedMealPlans,
  customerInvitations,
  trainerMealPlans,
  mealPlanAssignments,
  recipeFavorites,
  recipeCollections,
  collectionRecipes,
  recipeInteractions,
  groceryLists,
  groceryListItems,
  passwordResetTokens,
  refreshTokens
} from '@shared/schema';

// Mock the database
vi.mock('../../../server/db');
vi.mock('../../../server/utils/mealPlanEvents', () => ({
  handleMealPlanEvent: vi.fn(),
  createMealPlanEvent: vi.fn(),
  MealPlanEventType: {
    ASSIGNED: 'ASSIGNED',
    DELETED: 'DELETED'
  },
  onMealPlanAssigned: vi.fn()
}));

const mockDb = vi.mocked(db);

describe.skip('Storage Service - Comprehensive Tests', () => {
  // TODO: Fix Storage Service tests
  // Likely issues: DatabaseStorage mock setup, database query mocks, or schema changes
  // Review DatabaseStorage implementation and update test database mocks
  let storage: IStorage;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'customer' as const,
    password: 'hashed-password',
    googleId: null,
    profilePicture: null,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z')
  };

  const mockAdmin = {
    id: 'admin-456',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin' as const,
    password: 'admin-hash',
    googleId: null,
    profilePicture: null,
    createdAt: new Date('2024-01-10T08:00:00Z'),
    updatedAt: new Date('2024-01-10T08:00:00Z')
  };

  const mockTrainer = {
    id: 'trainer-789',
    email: 'trainer@example.com',
    name: 'Trainer User',
    role: 'trainer' as const,
    password: 'trainer-hash',
    googleId: 'google-123',
    profilePicture: 'https://example.com/trainer.jpg',
    createdAt: new Date('2024-01-12T09:00:00Z'),
    updatedAt: new Date('2024-01-12T09:00:00Z')
  };

  const mockRecipe = {
    id: 'recipe-abc123',
    name: 'High-Protein Quinoa Bowl',
    description: 'A nutritious quinoa bowl packed with protein and vegetables',
    mealTypes: ['Lunch', 'Dinner'],
    dietaryTags: ['Vegetarian', 'High-Protein'],
    mainIngredientTags: ['Quinoa', 'Black Beans'],
    ingredientsJson: [
      { name: 'Quinoa', amount: '150', unit: 'g' },
      { name: 'Black Beans', amount: '100', unit: 'g' },
      { name: 'Avocado', amount: '1', unit: 'medium' }
    ],
    instructionsText: 'Cook quinoa, add beans and vegetables, top with avocado.',
    prepTimeMinutes: 20,
    cookTimeMinutes: 25,
    servings: 2,
    caloriesKcal: 485,
    proteinGrams: '22.50',
    carbsGrams: '65.00',
    fatGrams: '18.00',
    imageUrl: 'https://s3.example.com/quinoa-bowl.jpg',
    sourceReference: 'Chef Recipe Database',
    isApproved: true,
    creationTimestamp: new Date('2024-01-15T11:00:00Z'),
    lastUpdatedTimestamp: new Date('2024-01-15T12:00:00Z')
  };

  const mockMealPlan = {
    id: 'meal-plan-xyz789',
    planName: 'Muscle Building Weekly Plan',
    fitnessGoal: 'muscle gain',
    description: 'A comprehensive 7-day meal plan for muscle building',
    dailyCalorieTarget: 2800,
    clientName: 'John Doe',
    days: 7,
    mealsPerDay: 4,
    generatedBy: 'trainer-789',
    createdAt: new Date('2024-01-16T10:00:00Z'),
    meals: [
      {
        day: 1,
        mealNumber: 1,
        mealType: 'Breakfast',
        recipe: {
          id: 'breakfast-recipe',
          name: 'Protein Pancakes',
          description: 'High-protein pancakes for muscle building',
          caloriesKcal: 620,
          proteinGrams: '45.00',
          carbsGrams: '55.00',
          fatGrams: '18.00',
          prepTimeMinutes: 15,
          cookTimeMinutes: 10,
          servings: 1,
          mealTypes: ['Breakfast'],
          dietaryTags: ['High-Protein'],
          mainIngredientTags: ['Protein Powder', 'Oats'],
          ingredientsJson: [
            { name: 'Protein Powder', amount: '30', unit: 'g' },
            { name: 'Oats', amount: '80', unit: 'g' }
          ],
          instructionsText: 'Blend ingredients and cook like pancakes.',
          imageUrl: 'https://s3.example.com/protein-pancakes.jpg'
        }
      }
    ]
  };

  const createMockSelectChain = (returnValue: any) => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(returnValue),
        limit: vi.fn().mockResolvedValue(returnValue),
        offset: vi.fn().mockResolvedValue(returnValue),
        groupBy: vi.fn().mockResolvedValue(returnValue)
      }),
      orderBy: vi.fn().mockResolvedValue(returnValue),
      limit: vi.fn().mockResolvedValue(returnValue),
      offset: vi.fn().mockResolvedValue(returnValue),
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(returnValue),
        orderBy: vi.fn().mockResolvedValue(returnValue),
        limit: vi.fn().mockResolvedValue(returnValue),
        offset: vi.fn().mockResolvedValue(returnValue)
      }),
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(returnValue)
      })
    })
  });

  const createMockInsertChain = (returnValue: any) => ({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(returnValue)
    })
  });

  const createMockUpdateChain = (returnValue: any) => ({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(returnValue)
      })
    })
  });

  const createMockDeleteChain = (rowCount: number) => ({
    where: vi.fn().mockResolvedValue({ rowCount })
  });

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new DatabaseStorage();

    // Default mock setup
    mockDb.select.mockReturnValue(createMockSelectChain([]));
    mockDb.insert.mockReturnValue(createMockInsertChain([]));
    mockDb.update.mockReturnValue(createMockUpdateChain([]));
    mockDb.delete.mockReturnValue(createMockDeleteChain(0));
    mockDb.transaction.mockImplementation((callback) => callback(mockDb));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('User Operations', () => {
    describe('getUser / getUserById', () => {
      it('should retrieve user by ID successfully', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([mockUser]));

        const result = await storage.getUser('user-123');

        expect(result).toEqual(mockUser);
        expect(mockDb.select).toHaveBeenCalled();
      });

      it('should return undefined for non-existent user', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([]));

        const result = await storage.getUser('non-existent');

        expect(result).toBeUndefined();
      });

      it('should handle database errors gracefully', async () => {
        mockDb.select.mockImplementation(() => {
          throw new Error('Database connection failed');
        });

        await expect(storage.getUser('user-123')).rejects.toThrow('Database connection failed');
      });

      it('getUserById should work identically to getUser', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([mockUser]));

        const result1 = await storage.getUser('user-123');
        const result2 = await storage.getUserById('user-123');

        expect(result1).toEqual(result2);
      });
    });

    describe('getUserByEmail', () => {
      it('should retrieve user by email successfully', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([mockUser]));

        const result = await storage.getUserByEmail('test@example.com');

        expect(result).toEqual(mockUser);
      });

      it('should return undefined for non-existent email', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([]));

        const result = await storage.getUserByEmail('nonexistent@example.com');

        expect(result).toBeUndefined();
      });

      it('should handle email case sensitivity', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([mockUser]));

        await storage.getUserByEmail('TEST@EXAMPLE.COM');

        expect(mockDb.select).toHaveBeenCalled();
      });

      it('should handle special characters in email', async () => {
        const emailWithSpecialChars = 'user+test.123@example-domain.co.uk';
        mockDb.select.mockReturnValue(createMockSelectChain([{ ...mockUser, email: emailWithSpecialChars }]));

        const result = await storage.getUserByEmail(emailWithSpecialChars);

        expect(result?.email).toBe(emailWithSpecialChars);
      });
    });

    describe('getUserByGoogleId', () => {
      it('should retrieve user by Google ID successfully', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([mockTrainer]));

        const result = await storage.getUserByGoogleId('google-123');

        expect(result).toEqual(mockTrainer);
      });

      it('should return undefined for non-existent Google ID', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([]));

        const result = await storage.getUserByGoogleId('non-existent-google-id');

        expect(result).toBeUndefined();
      });

      it('should handle null Google ID search', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([]));

        const result = await storage.getUserByGoogleId('');

        expect(result).toBeUndefined();
      });
    });

    describe('createUser', () => {
      it('should create user successfully with all fields', async () => {
        const newUserData = {
          email: 'newuser@example.com',
          name: 'New User',
          role: 'customer' as const,
          password: 'hashed-password',
          profilePicture: 'https://example.com/profile.jpg'
        };

        const createdUser = { ...newUserData, id: 'new-user-id', createdAt: new Date(), updatedAt: new Date() };
        mockDb.insert.mockReturnValue(createMockInsertChain([createdUser]));

        const result = await storage.createUser(newUserData);

        expect(result).toEqual(createdUser);
        expect(mockDb.insert).toHaveBeenCalled();
      });

      it('should create user with default password when not provided', async () => {
        const newUserData = {
          email: 'newuser@example.com',
          name: 'New User',
          role: 'customer' as const
        };

        const createdUser = {
          ...newUserData,
          password: 'test-password-hash',
          id: 'new-user-id',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockDb.insert.mockReturnValue(createMockInsertChain([createdUser]));

        const result = await storage.createUser(newUserData);

        expect(result.password).toBe('test-password-hash');
      });

      it('should handle user creation with minimal data', async () => {
        const minimalUserData = {
          email: 'minimal@example.com',
          role: 'customer' as const
        };

        const createdUser = {
          ...minimalUserData,
          name: null,
          password: 'test-password-hash',
          id: 'minimal-user-id',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockDb.insert.mockReturnValue(createMockInsertChain([createdUser]));

        const result = await storage.createUser(minimalUserData);

        expect(result.email).toBe('minimal@example.com');
        expect(result.role).toBe('customer');
      });

      it('should handle database constraint violations', async () => {
        const duplicateUserData = {
          email: 'existing@example.com',
          name: 'Duplicate User',
          role: 'customer' as const,
          password: 'password'
        };

        const constraintError = new Error('Unique constraint violation');
        (constraintError as any).code = '23505';
        mockDb.insert.mockImplementation(() => {
          throw constraintError;
        });

        await expect(storage.createUser(duplicateUserData)).rejects.toThrow('Unique constraint violation');
      });
    });

    describe('upsertUser', () => {
      it('should update existing user', async () => {
        const userData = {
          id: 'existing-user-id',
          email: 'updated@example.com',
          firstName: 'Updated',
          lastName: 'User',
          profileImageUrl: 'https://example.com/updated-profile.jpg'
        };

        // Mock user exists
        mockDb.select.mockReturnValue(createMockSelectChain([mockUser]));

        const updatedUser = {
          ...mockUser,
          email: 'updated@example.com',
          name: 'Updated User',
          profilePicture: 'https://example.com/updated-profile.jpg',
          updatedAt: new Date()
        };
        mockDb.update.mockReturnValue(createMockUpdateChain([updatedUser]));

        const result = await storage.upsertUser(userData);

        expect(result.email).toBe('updated@example.com');
        expect(result.name).toBe('Updated User');
        expect(mockDb.update).toHaveBeenCalled();
      });

      it('should create new user when user does not exist', async () => {
        const userData = {
          id: 'new-user-id',
          email: 'new@example.com',
          firstName: 'New',
          lastName: 'User',
          role: 'customer'
        };

        // Mock user does not exist
        mockDb.select.mockReturnValue(createMockSelectChain([]));

        const newUser = {
          ...userData,
          name: 'New User',
          password: 'test-password-hash',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockDb.insert.mockReturnValue(createMockInsertChain([newUser]));

        const result = await storage.upsertUser(userData);

        expect(result.email).toBe('new@example.com');
        expect(result.name).toBe('New User');
        expect(mockDb.insert).toHaveBeenCalled();
      });

      it('should handle name concatenation properly', async () => {
        const userDataWithNames = {
          id: 'test-user',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe'
        };

        mockDb.select.mockReturnValue(createMockSelectChain([]));
        mockDb.insert.mockReturnValue(createMockInsertChain([{
          ...userDataWithNames,
          name: 'John Doe'
        }]));

        const result = await storage.upsertUser(userDataWithNames);

        expect(result.name).toBe('John Doe');
      });

      it('should fallback to name field when firstName/lastName not provided', async () => {
        const userDataWithName = {
          id: 'test-user',
          email: 'test@example.com',
          name: 'Full Name'
        };

        mockDb.select.mockReturnValue(createMockSelectChain([]));
        mockDb.insert.mockReturnValue(createMockInsertChain([userDataWithName]));

        const result = await storage.upsertUser(userDataWithName);

        expect(result.name).toBe('Full Name');
      });
    });

    describe('createGoogleUser', () => {
      it('should create Google OAuth user successfully', async () => {
        const googleUserData = {
          email: 'google.user@example.com',
          googleId: 'google-oauth-id-123',
          name: 'Google User',
          profilePicture: 'https://lh3.googleusercontent.com/profile.jpg',
          role: 'customer' as const
        };

        const createdGoogleUser = {
          ...googleUserData,
          id: 'google-user-id',
          password: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockDb.insert.mockReturnValue(createMockInsertChain([createdGoogleUser]));

        const result = await storage.createGoogleUser(googleUserData);

        expect(result.googleId).toBe('google-oauth-id-123');
        expect(result.password).toBeNull();
        expect(result.email).toBe('google.user@example.com');
      });

      it('should handle Google user without profile picture', async () => {
        const googleUserData = {
          email: 'minimal.google@example.com',
          googleId: 'google-minimal-123',
          name: 'Minimal Google User',
          role: 'trainer' as const
        };

        const createdUser = {
          ...googleUserData,
          id: 'minimal-google-user',
          password: null,
          profilePicture: undefined,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockDb.insert.mockReturnValue(createMockInsertChain([createdUser]));

        const result = await storage.createGoogleUser(googleUserData);

        expect(result.googleId).toBe('google-minimal-123');
        expect(result.role).toBe('trainer');
      });

      it('should create admin Google user', async () => {
        const adminGoogleData = {
          email: 'admin.google@example.com',
          googleId: 'google-admin-456',
          name: 'Google Admin',
          role: 'admin' as const
        };

        const createdAdmin = {
          ...adminGoogleData,
          id: 'google-admin-id',
          password: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockDb.insert.mockReturnValue(createMockInsertChain([createdAdmin]));

        const result = await storage.createGoogleUser(adminGoogleData);

        expect(result.role).toBe('admin');
        expect(result.googleId).toBe('google-admin-456');
      });
    });

    describe('linkGoogleAccount', () => {
      it('should link Google account to existing user', async () => {
        const updatedUser = { ...mockUser, googleId: 'new-google-id' };
        mockDb.update.mockReturnValue(createMockUpdateChain([updatedUser]));

        await storage.linkGoogleAccount('user-123', 'new-google-id');

        expect(mockDb.update).toHaveBeenCalled();
      });

      it('should handle linking errors gracefully', async () => {
        mockDb.update.mockImplementation(() => {
          throw new Error('Update failed');
        });

        await expect(storage.linkGoogleAccount('user-123', 'google-id')).rejects.toThrow('Update failed');
      });
    });

    describe('updateUserPassword', () => {
      it('should update user password successfully', async () => {
        mockDb.update.mockReturnValue(createMockUpdateChain([{ ...mockUser, password: 'new-hashed-password' }]));

        await storage.updateUserPassword('user-123', 'new-hashed-password');

        expect(mockDb.update).toHaveBeenCalled();
      });

      it('should handle password update errors', async () => {
        mockDb.update.mockImplementation(() => {
          throw new Error('Password update failed');
        });

        await expect(storage.updateUserPassword('user-123', 'new-password')).rejects.toThrow('Password update failed');
      });
    });

    describe('updateUserEmail', () => {
      it('should update user email successfully', async () => {
        mockDb.update.mockReturnValue(createMockUpdateChain([{ ...mockUser, email: 'newemail@example.com' }]));

        await storage.updateUserEmail('user-123', 'newemail@example.com');

        expect(mockDb.update).toHaveBeenCalled();
      });

      it('should handle email constraint violations', async () => {
        const constraintError = new Error('Email already exists');
        (constraintError as any).code = '23505';
        mockDb.update.mockImplementation(() => {
          throw constraintError;
        });

        await expect(storage.updateUserEmail('user-123', 'existing@example.com')).rejects.toThrow('Email already exists');
      });
    });

    describe('deleteUserByEmail', () => {
      it('should delete user by email successfully', async () => {
        mockDb.delete.mockReturnValue(createMockDeleteChain(1));

        await storage.deleteUserByEmail('test@example.com');

        expect(mockDb.delete).toHaveBeenCalled();
      });

      it('should handle deletion of non-existent user', async () => {
        mockDb.delete.mockReturnValue(createMockDeleteChain(0));

        await storage.deleteUserByEmail('nonexistent@example.com');

        expect(mockDb.delete).toHaveBeenCalled();
      });

      it('should handle foreign key constraint errors', async () => {
        const constraintError = new Error('Foreign key constraint violation');
        (constraintError as any).code = '23503';
        mockDb.delete.mockImplementation(() => {
          throw constraintError;
        });

        await expect(storage.deleteUserByEmail('user@example.com')).rejects.toThrow('Foreign key constraint violation');
      });
    });

    describe('getCustomers', () => {
      const mockCustomers = [
        { ...mockUser, role: 'customer' as const },
        { ...mockUser, id: 'customer-2', email: 'customer2@example.com', role: 'customer' as const }
      ];

      it('should get all customers without filters', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain(mockCustomers));

        const result = await storage.getCustomers();

        expect(result).toHaveLength(2);
        expect(result[0].hasRecipe).toBe(false);
        expect(result[0].hasMealPlan).toBe(false);
      });

      it('should get customers with recipe assignment status', async () => {
        const recipeAssignments = [{ customerId: 'user-123' }];

        // First call for customers
        mockDb.select.mockReturnValueOnce(createMockSelectChain(mockCustomers));
        // Second call for recipe assignments
        mockDb.select.mockReturnValueOnce(createMockSelectChain(recipeAssignments));
        // Third call for meal plan assignments
        mockDb.select.mockReturnValueOnce(createMockSelectChain([]));

        const result = await storage.getCustomers('recipe-123');

        expect(result[0].hasRecipe).toBe(true);
        expect(result[1].hasRecipe).toBe(false);
      });

      it('should get customers with meal plan assignment status', async () => {
        const mealPlanAssignments = [{ customerId: 'customer-2' }];

        mockDb.select.mockReturnValueOnce(createMockSelectChain(mockCustomers));
        mockDb.select.mockReturnValueOnce(createMockSelectChain(mealPlanAssignments));

        const result = await storage.getCustomers(undefined, 'meal-plan-456');

        expect(result[0].hasMealPlan).toBe(false);
        expect(result[1].hasMealPlan).toBe(true);
      });

      it('should handle empty customer list', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([]));

        const result = await storage.getCustomers();

        expect(result).toHaveLength(0);
      });

      it('should filter by both recipe and meal plan', async () => {
        const recipeAssignments = [{ customerId: 'user-123' }];
        const mealPlanAssignments = [{ customerId: 'user-123' }];

        mockDb.select.mockReturnValueOnce(createMockSelectChain(mockCustomers));
        mockDb.select.mockReturnValueOnce(createMockSelectChain(recipeAssignments));
        mockDb.select.mockReturnValueOnce(createMockSelectChain(mealPlanAssignments));

        const result = await storage.getCustomers('recipe-123', 'meal-plan-456');

        expect(result[0].hasRecipe).toBe(true);
        expect(result[0].hasMealPlan).toBe(true);
      });
    });
  });

  describe('Password Reset Operations', () => {
    describe('createPasswordResetToken', () => {
      it('should create password reset token successfully', async () => {
        const token = 'reset-token-123';
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

        mockDb.insert.mockReturnValue(createMockInsertChain([{ userId: 'user-123', token, expiresAt }]));

        await storage.createPasswordResetToken('user-123', token, expiresAt);

        expect(mockDb.insert).toHaveBeenCalled();
      });

      it('should handle token creation errors', async () => {
        mockDb.insert.mockImplementation(() => {
          throw new Error('Token creation failed');
        });

        await expect(storage.createPasswordResetToken('user-123', 'token', new Date())).rejects.toThrow('Token creation failed');
      });
    });

    describe('getPasswordResetToken', () => {
      it('should retrieve password reset token successfully', async () => {
        const tokenData = { userId: 'user-123', expiresAt: new Date() };
        mockDb.select.mockReturnValue(createMockSelectChain([tokenData]));

        const result = await storage.getPasswordResetToken('reset-token-123');

        expect(result).toEqual(tokenData);
      });

      it('should return undefined for non-existent token', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([]));

        const result = await storage.getPasswordResetToken('non-existent-token');

        expect(result).toBeUndefined();
      });

      it('should handle expired tokens', async () => {
        const expiredTokenData = {
          userId: 'user-123',
          expiresAt: new Date(Date.now() - 3600000) // 1 hour ago
        };
        mockDb.select.mockReturnValue(createMockSelectChain([expiredTokenData]));

        const result = await storage.getPasswordResetToken('expired-token');

        expect(result).toEqual(expiredTokenData);
        // Note: Expiration check should be done by the caller
      });
    });

    describe('deletePasswordResetToken', () => {
      it('should delete password reset token successfully', async () => {
        mockDb.delete.mockReturnValue(createMockDeleteChain(1));

        await storage.deletePasswordResetToken('reset-token-123');

        expect(mockDb.delete).toHaveBeenCalled();
      });

      it('should handle deletion of non-existent token', async () => {
        mockDb.delete.mockReturnValue(createMockDeleteChain(0));

        await storage.deletePasswordResetToken('non-existent-token');

        expect(mockDb.delete).toHaveBeenCalled();
      });
    });
  });

  describe('Refresh Token Operations', () => {
    describe('createRefreshToken', () => {
      it('should create refresh token successfully', async () => {
        const token = 'refresh-token-abc123';
        const expiresAt = new Date(Date.now() + 7 * 24 * 3600000); // 7 days from now

        mockDb.insert.mockReturnValue(createMockInsertChain([{ userId: 'user-123', token, expiresAt }]));

        await storage.createRefreshToken('user-123', token, expiresAt);

        expect(mockDb.insert).toHaveBeenCalled();
      });
    });

    describe('getRefreshToken', () => {
      it('should retrieve refresh token successfully', async () => {
        const tokenData = { userId: 'user-123', expiresAt: new Date() };
        mockDb.select.mockReturnValue(createMockSelectChain([tokenData]));

        const result = await storage.getRefreshToken('refresh-token-abc123');

        expect(result).toEqual(tokenData);
      });

      it('should return undefined for invalid refresh token', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([]));

        const result = await storage.getRefreshToken('invalid-refresh-token');

        expect(result).toBeUndefined();
      });
    });

    describe('deleteRefreshToken', () => {
      it('should delete specific refresh token', async () => {
        mockDb.delete.mockReturnValue(createMockDeleteChain(1));

        await storage.deleteRefreshToken('refresh-token-abc123');

        expect(mockDb.delete).toHaveBeenCalled();
      });
    });

    describe('deleteAllRefreshTokensForUser', () => {
      it('should delete all refresh tokens for user', async () => {
        mockDb.delete.mockReturnValue(createMockDeleteChain(3)); // User had 3 tokens

        await storage.deleteAllRefreshTokensForUser('user-123');

        expect(mockDb.delete).toHaveBeenCalled();
      });

      it('should handle user with no refresh tokens', async () => {
        mockDb.delete.mockReturnValue(createMockDeleteChain(0));

        await storage.deleteAllRefreshTokensForUser('user-with-no-tokens');

        expect(mockDb.delete).toHaveBeenCalled();
      });
    });
  });

  describe('Recipe Operations', () => {
    describe('createRecipe', () => {
      it('should create recipe successfully', async () => {
        const newRecipeData = {
          name: 'New Test Recipe',
          description: 'A new test recipe',
          mealTypes: ['Breakfast'],
          dietaryTags: ['Healthy'],
          mainIngredientTags: ['Eggs'],
          ingredientsJson: [{ name: 'Eggs', amount: '2', unit: 'large' }],
          instructionsText: 'Scramble the eggs',
          prepTimeMinutes: 5,
          cookTimeMinutes: 5,
          servings: 1,
          caloriesKcal: 140,
          proteinGrams: '12.00',
          carbsGrams: '1.00',
          fatGrams: '10.00',
          imageUrl: 'https://example.com/eggs.jpg',
          sourceReference: 'Test Recipe Book',
          isApproved: false
        };

        const createdRecipe = { ...newRecipeData, id: 'new-recipe-id' };
        mockDb.insert.mockReturnValue(createMockInsertChain([createdRecipe]));

        const result = await storage.createRecipe(newRecipeData);

        expect(result).toEqual(createdRecipe);
        expect(mockDb.insert).toHaveBeenCalled();
      });

      it('should handle recipe creation with complex ingredients', async () => {
        const complexRecipeData = {
          name: 'Complex Recipe',
          description: 'Recipe with many ingredients',
          mealTypes: ['Lunch', 'Dinner'],
          dietaryTags: ['Vegetarian', 'Gluten-Free'],
          mainIngredientTags: ['Quinoa', 'Vegetables'],
          ingredientsJson: [
            { name: 'Quinoa', amount: '200', unit: 'g' },
            { name: 'Bell Peppers', amount: '150', unit: 'g' },
            { name: 'Onion', amount: '1', unit: 'medium' },
            { name: 'Olive Oil', amount: '2', unit: 'tbsp' },
            { name: 'Salt', amount: '1', unit: 'tsp' }
          ],
          instructionsText: 'Detailed cooking instructions here...',
          prepTimeMinutes: 30,
          cookTimeMinutes: 45,
          servings: 4,
          caloriesKcal: 320,
          proteinGrams: '12.00',
          carbsGrams: '55.00',
          fatGrams: '8.00',
          imageUrl: 'https://example.com/complex-recipe.jpg',
          sourceReference: 'Professional Chef',
          isApproved: true
        };

        const createdRecipe = { ...complexRecipeData, id: 'complex-recipe-id' };
        mockDb.insert.mockReturnValue(createMockInsertChain([createdRecipe]));

        const result = await storage.createRecipe(complexRecipeData);

        expect(result.ingredientsJson).toHaveLength(5);
        expect(result.mealTypes).toEqual(['Lunch', 'Dinner']);
      });

      it('should handle database constraint violations in recipe creation', async () => {
        const recipeData = { name: 'Duplicate Recipe' };
        const constraintError = new Error('Recipe name must be unique');
        (constraintError as any).code = '23505';

        mockDb.insert.mockImplementation(() => {
          throw constraintError;
        });

        await expect(storage.createRecipe(recipeData)).rejects.toThrow('Recipe name must be unique');
      });
    });

    describe('getRecipe', () => {
      it('should retrieve recipe by ID successfully', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([mockRecipe]));

        const result = await storage.getRecipe('recipe-abc123');

        expect(result).toEqual(mockRecipe);
      });

      it('should return undefined for non-existent recipe', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([]));

        const result = await storage.getRecipe('non-existent-recipe');

        expect(result).toBeUndefined();
      });

      it('should handle malformed recipe ID', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([]));

        const result = await storage.getRecipe('invalid-uuid-format');

        expect(result).toBeUndefined();
      });
    });

    describe('updateRecipe', () => {
      it('should update recipe successfully', async () => {
        const updates = {
          name: 'Updated Recipe Name',
          description: 'Updated description',
          prepTimeMinutes: 25,
          isApproved: true
        };

        const updatedRecipe = {
          ...mockRecipe,
          ...updates,
          lastUpdatedTimestamp: new Date()
        };
        mockDb.update.mockReturnValue(createMockUpdateChain([updatedRecipe]));

        const result = await storage.updateRecipe('recipe-abc123', updates);

        expect(result).toEqual(updatedRecipe);
        expect(result?.name).toBe('Updated Recipe Name');
        expect(result?.prepTimeMinutes).toBe(25);
      });

      it('should update recipe arrays correctly', async () => {
        const updates = {
          mealTypes: ['Breakfast', 'Brunch'],
          dietaryTags: ['Keto', 'Low-Carb'],
          mainIngredientTags: ['Avocado', 'Eggs']
        };

        const updatedRecipe = { ...mockRecipe, ...updates };
        mockDb.update.mockReturnValue(createMockUpdateChain([updatedRecipe]));

        const result = await storage.updateRecipe('recipe-abc123', updates);

        expect(result?.mealTypes).toEqual(['Breakfast', 'Brunch']);
        expect(result?.dietaryTags).toEqual(['Keto', 'Low-Carb']);
        expect(result?.mainIngredientTags).toEqual(['Avocado', 'Eggs']);
      });

      it('should handle partial updates', async () => {
        const partialUpdates = { isApproved: false };

        const updatedRecipe = { ...mockRecipe, isApproved: false };
        mockDb.update.mockReturnValue(createMockUpdateChain([updatedRecipe]));

        const result = await storage.updateRecipe('recipe-abc123', partialUpdates);

        expect(result?.isApproved).toBe(false);
        expect(result?.name).toBe(mockRecipe.name); // Unchanged
      });

      it('should return undefined for non-existent recipe', async () => {
        mockDb.update.mockReturnValue(createMockUpdateChain([]));

        const result = await storage.updateRecipe('non-existent', { name: 'New Name' });

        expect(result).toBeUndefined();
      });

      it('should handle update with ingredients JSON', async () => {
        const updates = {
          ingredientsJson: [
            { name: 'New Ingredient', amount: '100', unit: 'g' },
            { name: 'Another Ingredient', amount: '50', unit: 'ml' }
          ]
        };

        const updatedRecipe = { ...mockRecipe, ...updates };
        mockDb.update.mockReturnValue(createMockUpdateChain([updatedRecipe]));

        const result = await storage.updateRecipe('recipe-abc123', updates);

        expect(result?.ingredientsJson).toHaveLength(2);
        expect(result?.ingredientsJson[0].name).toBe('New Ingredient');
      });
    });

    describe('deleteRecipe', () => {
      it('should delete existing recipe successfully', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([mockRecipe])); // Recipe exists
        mockDb.delete.mockReturnValue(createMockDeleteChain(1));

        const result = await storage.deleteRecipe('recipe-abc123');

        expect(result).toBe(true);
        expect(mockDb.delete).toHaveBeenCalled();
      });

      it('should return false for non-existent recipe', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([])); // Recipe doesn't exist

        const result = await storage.deleteRecipe('non-existent-recipe');

        expect(result).toBe(false);
        expect(mockDb.delete).not.toHaveBeenCalled();
      });

      it('should handle deletion errors gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockDb.select.mockReturnValue(createMockSelectChain([mockRecipe]));
        mockDb.delete.mockImplementation(() => {
          throw new Error('Deletion failed');
        });

        const result = await storage.deleteRecipe('recipe-abc123');

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Error deleting recipe:', expect.any(Error));

        consoleSpy.mockRestore();
      });

      it('should handle foreign key constraint errors', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockDb.select.mockReturnValue(createMockSelectChain([mockRecipe]));

        const constraintError = new Error('Foreign key constraint');
        (constraintError as any).code = '23503';
        mockDb.delete.mockImplementation(() => {
          throw constraintError;
        });

        const result = await storage.deleteRecipe('recipe-abc123');

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });

    describe('bulkDeleteRecipes', () => {
      it('should delete multiple recipes successfully', async () => {
        const recipeIds = ['recipe-1', 'recipe-2', 'recipe-3'];
        mockDb.delete.mockReturnValue(createMockDeleteChain(3));

        const result = await storage.bulkDeleteRecipes(recipeIds);

        expect(result).toBe(3);
        expect(mockDb.delete).toHaveBeenCalled();
      });

      it('should handle partial deletion', async () => {
        const recipeIds = ['recipe-1', 'recipe-2', 'non-existent'];
        mockDb.delete.mockReturnValue(createMockDeleteChain(2)); // Only 2 deleted

        const result = await storage.bulkDeleteRecipes(recipeIds);

        expect(result).toBe(2);
      });

      it('should handle empty ID list', async () => {
        const result = await storage.bulkDeleteRecipes([]);

        expect(result).toBe(0);
        expect(mockDb.delete).not.toHaveBeenCalled();
      });

      it('should handle bulk deletion errors', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockDb.delete.mockImplementation(() => {
          throw new Error('Bulk deletion failed');
        });

        const result = await storage.bulkDeleteRecipes(['recipe-1', 'recipe-2']);

        expect(result).toBe(0);
        expect(consoleSpy).toHaveBeenCalledWith('Error bulk deleting recipes:', expect.any(Error));

        consoleSpy.mockRestore();
      });

      it('should handle large batch deletion', async () => {
        const largeRecipeIds = Array.from({ length: 1000 }, (_, i) => `recipe-${i}`);
        mockDb.delete.mockReturnValue(createMockDeleteChain(1000));

        const result = await storage.bulkDeleteRecipes(largeRecipeIds);

        expect(result).toBe(1000);
      });
    });

    describe('approveRecipe', () => {
      it('should approve recipe successfully', async () => {
        const approvedRecipe = { ...mockRecipe, isApproved: true };
        mockDb.update.mockReturnValue(createMockUpdateChain([approvedRecipe]));

        const result = await storage.approveRecipe('recipe-abc123');

        expect(result?.isApproved).toBe(true);
      });

      it('should handle approval of non-existent recipe', async () => {
        mockDb.update.mockReturnValue(createMockUpdateChain([]));

        const result = await storage.approveRecipe('non-existent-recipe');

        expect(result).toBeUndefined();
      });
    });
  });

  describe('Recipe Search and Filtering', () => {
    describe('searchRecipes', () => {
      const mockSearchResults = [mockRecipe];

      beforeEach(() => {
        // Mock count query
        mockDb.select.mockReturnValueOnce(createMockSelectChain([{ count: 1 }]));
        // Mock search results query
        mockDb.select.mockReturnValueOnce(createMockSelectChain(mockSearchResults));
      });

      it('should search recipes with no filters', async () => {
        const result = await storage.searchRecipes({});

        expect(result.recipes).toEqual(mockSearchResults);
        expect(result.total).toBe(1);
      });

      it('should filter by approval status', async () => {
        await storage.searchRecipes({ approved: true });

        expect(mockDb.select).toHaveBeenCalled();
      });

      it('should search by text query', async () => {
        await storage.searchRecipes({ search: 'quinoa bowl' });

        expect(mockDb.select).toHaveBeenCalled();
      });

      it('should filter by meal type', async () => {
        await storage.searchRecipes({ mealType: 'Lunch' });

        expect(mockDb.select).toHaveBeenCalled();
      });

      it('should filter by dietary tag', async () => {
        await storage.searchRecipes({ dietaryTag: 'Vegetarian' });

        expect(mockDb.select).toHaveBeenCalled();
      });

      it('should filter by preparation time', async () => {
        await storage.searchRecipes({ maxPrepTime: 30 });

        expect(mockDb.select).toHaveBeenCalled();
      });

      it('should filter by calorie range', async () => {
        await storage.searchRecipes({ minCalories: 200, maxCalories: 600 });

        expect(mockDb.select).toHaveBeenCalled();
      });

      it('should filter by protein range', async () => {
        await storage.searchRecipes({ minProtein: 15, maxProtein: 35 });

        expect(mockDb.select).toHaveBeenCalled();
      });

      it('should filter by carb range', async () => {
        await storage.searchRecipes({ minCarbs: 30, maxCarbs: 80 });

        expect(mockDb.select).toHaveBeenCalled();
      });

      it('should filter by fat range', async () => {
        await storage.searchRecipes({ minFat: 10, maxFat: 25 });

        expect(mockDb.select).toHaveBeenCalled();
      });

      it('should handle pagination correctly', async () => {
        await storage.searchRecipes({ page: 2, limit: 10 });

        expect(mockDb.select).toHaveBeenCalled();
      });

      it('should use default pagination values', async () => {
        await storage.searchRecipes({});

        // Should use default page: 1, limit: 12
        expect(mockDb.select).toHaveBeenCalled();
      });

      it('should handle complex search with multiple filters', async () => {
        const complexFilters = {
          search: 'protein',
          approved: true,
          mealType: 'Dinner',
          dietaryTag: 'High-Protein',
          maxPrepTime: 45,
          minCalories: 300,
          maxCalories: 700,
          minProtein: 20,
          maxProtein: 50,
          page: 1,
          limit: 15
        };

        await storage.searchRecipes(complexFilters);

        expect(mockDb.select).toHaveBeenCalled();
      });

      it('should handle empty search results', async () => {
        mockDb.select.mockReturnValueOnce(createMockSelectChain([{ count: 0 }]));
        mockDb.select.mockReturnValueOnce(createMockSelectChain([]));

        const result = await storage.searchRecipes({ search: 'nonexistent recipe' });

        expect(result.recipes).toHaveLength(0);
        expect(result.total).toBe(0);
      });

      it('should handle special characters in search', async () => {
        await storage.searchRecipes({ search: 'café crème brûlée' });

        expect(mockDb.select).toHaveBeenCalled();
      });

      it('should handle very long search queries', async () => {
        const longQuery = 'a'.repeat(1000);
        await storage.searchRecipes({ search: longQuery });

        expect(mockDb.select).toHaveBeenCalled();
      });
    });

    describe('getRecipeStats', () => {
      it('should return recipe statistics successfully', async () => {
        const mockStats = {
          total: 150,
          approved: 120,
          pending: 30
        };

        mockDb.select.mockReturnValue(createMockSelectChain([mockStats]));

        const result = await storage.getRecipeStats();

        expect(result).toEqual({
          total: 150,
          approved: 120,
          pending: 30
        });
      });

      it('should handle zero recipes', async () => {
        const emptyStats = {
          total: 0,
          approved: 0,
          pending: 0
        };

        mockDb.select.mockReturnValue(createMockSelectChain([emptyStats]));

        const result = await storage.getRecipeStats();

        expect(result.total).toBe(0);
        expect(result.approved).toBe(0);
        expect(result.pending).toBe(0);
      });

      it('should handle database errors in stats', async () => {
        mockDb.select.mockImplementation(() => {
          throw new Error('Stats query failed');
        });

        await expect(storage.getRecipeStats()).rejects.toThrow('Stats query failed');
      });
    });
  });

  describe('Personalized Recipe Operations', () => {
    describe('getPersonalizedRecipes', () => {
      it('should get assigned recipes for customer', async () => {
        const assignedRecipes = [
          { recipe: mockRecipe }
        ];

        mockDb.select.mockReturnValue(createMockSelectChain(assignedRecipes));

        const result = await storage.getPersonalizedRecipes('customer-123');

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockRecipe);
      });

      it('should filter out null recipes', async () => {
        const assignedRecipes = [
          { recipe: mockRecipe },
          { recipe: null }, // This should be filtered out
          { recipe: { ...mockRecipe, id: 'recipe-2' } }
        ];

        mockDb.select.mockReturnValue(createMockSelectChain(assignedRecipes));

        const result = await storage.getPersonalizedRecipes('customer-123');

        expect(result).toHaveLength(2);
        expect(result.every(r => r !== null)).toBe(true);
      });

      it('should handle customer with no assigned recipes', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([]));

        const result = await storage.getPersonalizedRecipes('customer-with-no-recipes');

        expect(result).toHaveLength(0);
      });
    });

    describe('assignRecipeToCustomers', () => {
      it('should assign recipe to new customers', async () => {
        const currentAssignments = [];
        const customerIds = ['customer-1', 'customer-2'];

        // Mock current assignments query
        mockDb.select.mockReturnValue(createMockSelectChain(currentAssignments));
        // Mock insert operation
        mockDb.insert.mockReturnValue(createMockInsertChain([]));

        await storage.assignRecipeToCustomers('trainer-123', 'recipe-abc123', customerIds);

        expect(mockDb.insert).toHaveBeenCalled();
        expect(mockDb.delete).not.toHaveBeenCalled(); // No customers to remove
      });

      it('should remove unassigned customers', async () => {
        const currentAssignments = [
          { customerId: 'customer-1' },
          { customerId: 'customer-2' },
          { customerId: 'customer-3' }
        ];
        const newCustomerIds = ['customer-1', 'customer-4']; // Remove 2,3 and add 4

        mockDb.select.mockReturnValue(createMockSelectChain(currentAssignments));
        mockDb.delete.mockReturnValue(createMockDeleteChain(2)); // Removing 2 customers
        mockDb.insert.mockReturnValue(createMockInsertChain([]));

        await storage.assignRecipeToCustomers('trainer-123', 'recipe-abc123', newCustomerIds);

        expect(mockDb.delete).toHaveBeenCalled(); // Should remove customer-2, customer-3
        expect(mockDb.insert).toHaveBeenCalled(); // Should add customer-4
      });

      it('should handle no changes scenario', async () => {
        const currentAssignments = [
          { customerId: 'customer-1' },
          { customerId: 'customer-2' }
        ];
        const sameCustomerIds = ['customer-1', 'customer-2'];

        mockDb.select.mockReturnValue(createMockSelectChain(currentAssignments));

        await storage.assignRecipeToCustomers('trainer-123', 'recipe-abc123', sameCustomerIds);

        expect(mockDb.delete).not.toHaveBeenCalled();
        expect(mockDb.insert).not.toHaveBeenCalled();
      });

      it('should handle assignment to empty customer list', async () => {
        const currentAssignments = [
          { customerId: 'customer-1' },
          { customerId: 'customer-2' }
        ];

        mockDb.select.mockReturnValue(createMockSelectChain(currentAssignments));
        mockDb.delete.mockReturnValue(createMockDeleteChain(2));

        await storage.assignRecipeToCustomers('trainer-123', 'recipe-abc123', []);

        expect(mockDb.delete).toHaveBeenCalled(); // Remove all current assignments
        expect(mockDb.insert).not.toHaveBeenCalled(); // No new assignments
      });
    });
  });

  describe('Customer Invitation Operations', () => {
    const mockInvitation = {
      id: 'invitation-123',
      trainerId: 'trainer-789',
      email: 'invited@example.com',
      token: 'invitation-token-abc',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      usedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    describe('createInvitation', () => {
      it('should create invitation successfully', async () => {
        const invitationData = {
          trainerId: 'trainer-789',
          email: 'invited@example.com',
          token: 'invitation-token-abc',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        };

        mockDb.insert.mockReturnValue(createMockInsertChain([mockInvitation]));

        const result = await storage.createInvitation(invitationData);

        expect(result).toEqual(mockInvitation);
        expect(mockDb.insert).toHaveBeenCalled();
      });

      it('should handle duplicate invitation errors', async () => {
        const duplicateError = new Error('Invitation already exists');
        (duplicateError as any).code = '23505';
        mockDb.insert.mockImplementation(() => {
          throw duplicateError;
        });

        const invitationData = {
          trainerId: 'trainer-789',
          email: 'existing@example.com',
          token: 'duplicate-token',
          expiresAt: new Date()
        };

        await expect(storage.createInvitation(invitationData)).rejects.toThrow('Invitation already exists');
      });
    });

    describe('getInvitation', () => {
      it('should retrieve invitation by token', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([mockInvitation]));

        const result = await storage.getInvitation('invitation-token-abc');

        expect(result).toEqual(mockInvitation);
      });

      it('should return undefined for invalid token', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([]));

        const result = await storage.getInvitation('invalid-token');

        expect(result).toBeUndefined();
      });

      it('should retrieve expired invitation', async () => {
        const expiredInvitation = {
          ...mockInvitation,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        };
        mockDb.select.mockReturnValue(createMockSelectChain([expiredInvitation]));

        const result = await storage.getInvitation('expired-token');

        expect(result?.expiresAt.getTime()).toBeLessThan(Date.now());
      });
    });

    describe('getInvitationsByTrainer', () => {
      it('should get all invitations for trainer', async () => {
        const trainerInvitations = [
          mockInvitation,
          { ...mockInvitation, id: 'invitation-456', email: 'another@example.com' }
        ];

        mockDb.select.mockReturnValue(createMockSelectChain(trainerInvitations));

        const result = await storage.getInvitationsByTrainer('trainer-789');

        expect(result).toHaveLength(2);
        expect(result).toEqual(trainerInvitations);
      });

      it('should handle trainer with no invitations', async () => {
        mockDb.select.mockReturnValue(createMockSelectChain([]));

        const result = await storage.getInvitationsByTrainer('trainer-no-invitations');

        expect(result).toHaveLength(0);
      });
    });

    describe('markInvitationAsUsed', () => {
      it('should mark invitation as used', async () => {
        const usedInvitation = { ...mockInvitation, usedAt: new Date() };
        mockDb.update.mockReturnValue(createMockUpdateChain([usedInvitation]));

        await storage.markInvitationAsUsed('invitation-token-abc');

        expect(mockDb.update).toHaveBeenCalled();
      });

      it('should handle marking non-existent invitation', async () => {
        mockDb.update.mockReturnValue(createMockUpdateChain([]));

        await storage.markInvitationAsUsed('non-existent-token');

        expect(mockDb.update).toHaveBeenCalled();
      });
    });

    // Skipped: deleteExpiredInvitations function not implemented in storage service
    describe.skip('deleteExpiredInvitations', () => {
      it('should delete expired invitations successfully', async () => {
        mockDb.delete.mockReturnValue(createMockDeleteChain(5)); // 5 expired invitations

        const result = await storage.deleteExpiredInvitations();

        expect(result).toBe(5);
        expect(mockDb.delete).toHaveBeenCalled();
      });

      it('should handle no expired invitations', async () => {
        mockDb.delete.mockReturnValue(createMockDeleteChain(0));

        const result = await storage.deleteExpiredInvitations();

        expect(result).toBe(0);
      });

      it('should handle deletion errors gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockDb.delete.mockImplementation(() => {
          throw new Error('Deletion failed');
        });

        const result = await storage.deleteExpiredInvitations();

        expect(result).toBe(0);
        expect(consoleSpy).toHaveBeenCalledWith('Error deleting expired invitations:', expect.any(Error));

        consoleSpy.mockRestore();
      });
    });
  });

  describe('Transaction Support', () => {
    it('should execute transaction successfully', async () => {
      const mockTransactionResult = { success: true };
      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });

      const result = await storage.transaction(async (trx) => {
        // Mock transaction operations
        return mockTransactionResult;
      });

      expect(result).toEqual(mockTransactionResult);
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should handle transaction rollback on error', async () => {
      const transactionError = new Error('Transaction failed');
      mockDb.transaction.mockImplementation(async (callback) => {
        throw transactionError;
      });

      await expect(storage.transaction(async (trx) => {
        throw transactionError;
      })).rejects.toThrow('Transaction failed');
    });

    it('should pass transaction object to callback', async () => {
      let receivedTrx;
      mockDb.transaction.mockImplementation(async (callback) => {
        receivedTrx = mockDb;
        return await callback(mockDb);
      });

      await storage.transaction(async (trx) => {
        expect(trx).toBe(mockDb);
        return 'success';
      });

      expect(receivedTrx).toBe(mockDb);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null database responses', async () => {
      // Empty array means no user found, which returns undefined
      mockDb.select.mockReturnValue(createMockSelectChain([]));

      const result = await storage.getUser('user-123');

      expect(result).toBeUndefined();
    });

    it('should handle undefined database responses', async () => {
      // Empty array means no user found, which returns undefined
      mockDb.select.mockReturnValue(createMockSelectChain([]));

      const result = await storage.getUser('user-123');

      expect(result).toBeUndefined();
    });

    it('should handle database connection timeouts', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Connection timeout');
      });

      await expect(storage.getUser('user-123')).rejects.toThrow('Connection timeout');
    });

    it('should handle malformed JSON data', async () => {
      const recipeWithBadJson = {
        ...mockRecipe,
        ingredientsJson: 'invalid json string'
      };

      mockDb.select.mockReturnValue(createMockSelectChain([recipeWithBadJson]));

      const result = await storage.getRecipe('recipe-123');

      expect(result?.ingredientsJson).toBe('invalid json string');
    });

    it('should handle extremely large data sets', async () => {
      const largeRecipeList = Array.from({ length: 10000 }, (_, i) => ({
        ...mockRecipe,
        id: `recipe-${i}`,
        name: `Recipe ${i}`
      }));

      mockDb.select.mockReturnValueOnce(createMockSelectChain([{ count: 10000 }]));
      mockDb.select.mockReturnValueOnce(createMockSelectChain(largeRecipeList));

      const result = await storage.searchRecipes({ limit: 10000 });

      expect(result.recipes).toHaveLength(10000);
      expect(result.total).toBe(10000);
    });

    it('should handle concurrent operations safely', async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        storage.getUser(`user-${i}`)
      );

      mockDb.select.mockReturnValue(createMockSelectChain([mockUser]));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result).toEqual(mockUser);
      });
    });

    it('should handle special characters in search queries', async () => {
      const specialCharQuery = '!@#$%^&*()[]{}|;:,.<>?';

      mockDb.select.mockReturnValueOnce(createMockSelectChain([{ count: 0 }]));
      mockDb.select.mockReturnValueOnce(createMockSelectChain([]));

      const result = await storage.searchRecipes({ search: specialCharQuery });

      expect(result.recipes).toHaveLength(0);
    });

    it('should handle unicode characters in data', async () => {
      const unicodeRecipe = {
        ...mockRecipe,
        name: 'Café Crème Brûlée with Açaí 🥄',
        description: 'A dessert with special characters: αβγδε'
      };

      mockDb.insert.mockReturnValue(createMockInsertChain([unicodeRecipe]));

      const result = await storage.createRecipe(unicodeRecipe);

      expect(result.name).toContain('🥄');
      expect(result.description).toContain('αβγδε');
    });

    it('should handle very long text fields', async () => {
      const longTextRecipe = {
        ...mockRecipe,
        description: 'a'.repeat(10000),
        instructionsText: 'b'.repeat(50000)
      };

      mockDb.insert.mockReturnValue(createMockInsertChain([longTextRecipe]));

      const result = await storage.createRecipe(longTextRecipe);

      expect(result.description).toHaveLength(10000);
      expect(result.instructionsText).toHaveLength(50000);
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle queries with complex WHERE clauses', async () => {
      const complexFilters = {
        search: 'complex query',
        approved: true,
        mealType: 'Dinner',
        dietaryTag: 'Vegan',
        maxPrepTime: 30,
        minCalories: 300,
        maxCalories: 600,
        minProtein: 15,
        maxProtein: 40,
        minCarbs: 20,
        maxCarbs: 80,
        minFat: 5,
        maxFat: 25
      };

      mockDb.select.mockReturnValueOnce(createMockSelectChain([{ count: 5 }]));
      mockDb.select.mockReturnValueOnce(createMockSelectChain([mockRecipe]));

      const result = await storage.searchRecipes(complexFilters);

      expect(result.recipes).toHaveLength(1);
      expect(result.total).toBe(5);
    });

    it('should handle pagination with large offsets', async () => {
      const largePageFilters = {
        page: 1000,
        limit: 50
      };

      mockDb.select.mockReturnValueOnce(createMockSelectChain([{ count: 50000 }]));
      mockDb.select.mockReturnValueOnce(createMockSelectChain([]));

      const result = await storage.searchRecipes(largePageFilters);

      expect(result.total).toBe(50000);
      expect(result.recipes).toHaveLength(0);
    });

    it('should handle bulk operations efficiently', async () => {
      const largeIdList = Array.from({ length: 5000 }, (_, i) => `recipe-${i}`);

      mockDb.delete.mockReturnValue(createMockDeleteChain(5000));

      const result = await storage.bulkDeleteRecipes(largeIdList);

      expect(result).toBe(5000);
    });
  });
});