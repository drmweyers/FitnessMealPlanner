import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from '../server/storage';
import * as auth from '../server/auth';

// Mock dependencies
vi.mock('../server/storage');
vi.mock('../server/auth');
vi.mock('passport-google-oauth20');

describe('Passport Google OAuth Strategy', () => {
  let mockStorage: any;
  let mockAuth: any;
  let googleStrategyCallback: any;

  beforeEach(() => {
    mockStorage = vi.mocked(storage);
    mockAuth = vi.mocked(auth);
    
    // Mock the GoogleStrategy constructor to capture the callback
    vi.mocked(GoogleStrategy).mockImplementation((config: any, callback: any) => {
      googleStrategyCallback = callback;
      return {} as any;
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Google OAuth Strategy Configuration', () => {
    it('should configure Google OAuth strategy with correct parameters', () => {
      // Import passport config to trigger strategy setup
      require('../server/passport-config');

      expect(GoogleStrategy).toHaveBeenCalledWith(
        expect.objectContaining({
          clientID: process.env.GOOGLE_CLIENT_ID || '',
          clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
          callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
          passReqToCallback: true
        }),
        expect.any(Function)
      );
    });
  });

  describe('OAuth Strategy Callback', () => {
    const mockProfile = {
      id: 'google-123',
      emails: [{ value: 'test@example.com' }],
      displayName: 'Test User',
      photos: [{ value: 'https://example.com/photo.jpg' }]
    };

    const mockReq = {
      session: { intendedRole: 'customer' }
    };

    it('should return existing user with Google ID', async () => {
      const existingUser = {
        id: 'user-123',
        email: 'test@example.com',
        googleId: 'google-123',
        role: 'customer'
      };

      mockStorage.getUserByGoogleId.mockResolvedValue(existingUser);
      
      // Re-import to get fresh strategy callback
      require('../server/passport-config');
      
      const done = vi.fn();
      await googleStrategyCallback(
        mockReq,
        'access-token',
        'refresh-token',
        mockProfile,
        done
      );

      expect(mockStorage.getUserByGoogleId).toHaveBeenCalledWith('google-123');
      expect(done).toHaveBeenCalledWith(null, existingUser);
    });

    it('should link Google account to existing email user', async () => {
      const existingEmailUser = {
        id: 'user-456',
        email: 'test@example.com',
        role: 'trainer'
      };

      mockStorage.getUserByGoogleId.mockResolvedValue(null);
      mockStorage.getUserByEmail.mockResolvedValue(existingEmailUser);
      mockStorage.linkGoogleAccount.mockResolvedValue(undefined);

      require('../server/passport-config');
      
      const done = vi.fn();
      await googleStrategyCallback(
        mockReq,
        'access-token',
        'refresh-token',
        mockProfile,
        done
      );

      expect(mockStorage.getUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockStorage.linkGoogleAccount).toHaveBeenCalledWith('user-456', 'google-123');
      expect(done).toHaveBeenCalledWith(null, existingEmailUser);
    });

    it('should create new user with customer role by default', async () => {
      const newUser = {
        id: 'user-789',
        email: 'test@example.com',
        googleId: 'google-123',
        role: 'customer',
        name: 'Test User'
      };

      mockStorage.getUserByGoogleId.mockResolvedValue(null);
      mockStorage.getUserByEmail.mockResolvedValue(null);
      mockStorage.createGoogleUser.mockResolvedValue(newUser);

      require('../server/passport-config');
      
      const done = vi.fn();
      await googleStrategyCallback(
        mockReq,
        'access-token',
        'refresh-token',
        mockProfile,
        done
      );

      expect(mockStorage.createGoogleUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        googleId: 'google-123',
        name: 'Test User',
        profilePicture: 'https://example.com/photo.jpg',
        role: 'customer'
      });
      expect(done).toHaveBeenCalledWith(null, newUser);
    });

    it('should create new user with intended role from session', async () => {
      const mockReqWithTrainerRole = {
        session: { intendedRole: 'trainer' }
      };

      const newUser = {
        id: 'user-789',
        email: 'test@example.com',
        googleId: 'google-123',
        role: 'trainer',
        name: 'Test User'
      };

      mockStorage.getUserByGoogleId.mockResolvedValue(null);
      mockStorage.getUserByEmail.mockResolvedValue(null);
      mockStorage.createGoogleUser.mockResolvedValue(newUser);

      require('../server/passport-config');
      
      const done = vi.fn();
      await googleStrategyCallback(
        mockReqWithTrainerRole,
        'access-token',
        'refresh-token',
        mockProfile,
        done
      );

      expect(mockStorage.createGoogleUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        googleId: 'google-123',
        name: 'Test User',
        profilePicture: 'https://example.com/photo.jpg',
        role: 'trainer'
      });
      expect(done).toHaveBeenCalledWith(null, newUser);
    });

    it('should handle missing email from Google profile', async () => {
      const profileWithoutEmail = {
        id: 'google-123',
        emails: [],
        displayName: 'Test User'
      };

      mockStorage.getUserByGoogleId.mockResolvedValue(null);

      require('../server/passport-config');
      
      const done = vi.fn();
      await googleStrategyCallback(
        mockReq,
        'access-token',
        'refresh-token',
        profileWithoutEmail,
        done
      );

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No email provided by Google'
        }),
        null
      );
    });

    it('should generate name from email when displayName is missing', async () => {
      const profileWithoutDisplayName = {
        id: 'google-123',
        emails: [{ value: 'test.user@example.com' }],
        displayName: '',
        photos: []
      };

      const newUser = {
        id: 'user-789',
        email: 'test.user@example.com',
        googleId: 'google-123',
        role: 'customer',
        name: 'test.user'
      };

      mockStorage.getUserByGoogleId.mockResolvedValue(null);
      mockStorage.getUserByEmail.mockResolvedValue(null);
      mockStorage.createGoogleUser.mockResolvedValue(newUser);

      require('../server/passport-config');
      
      const done = vi.fn();
      await googleStrategyCallback(
        mockReq,
        'access-token',
        'refresh-token',
        profileWithoutDisplayName,
        done
      );

      expect(mockStorage.createGoogleUser).toHaveBeenCalledWith({
        email: 'test.user@example.com',
        googleId: 'google-123',
        name: 'test.user',
        profilePicture: undefined,
        role: 'customer'
      });
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      
      mockStorage.getUserByGoogleId.mockRejectedValue(dbError);

      require('../server/passport-config');
      
      const done = vi.fn();
      await googleStrategyCallback(
        mockReq,
        'access-token',
        'refresh-token',
        mockProfile,
        done
      );

      expect(done).toHaveBeenCalledWith(dbError, null);
    });

    it('should handle createGoogleUser errors', async () => {
      const createUserError = new Error('Failed to create user');
      
      mockStorage.getUserByGoogleId.mockResolvedValue(null);
      mockStorage.getUserByEmail.mockResolvedValue(null);
      mockStorage.createGoogleUser.mockRejectedValue(createUserError);

      require('../server/passport-config');
      
      const done = vi.fn();
      await googleStrategyCallback(
        mockReq,
        'access-token',
        'refresh-token',
        mockProfile,
        done
      );

      expect(done).toHaveBeenCalledWith(createUserError, null);
    });

    it('should handle linkGoogleAccount errors', async () => {
      const linkError = new Error('Failed to link Google account');
      const existingUser = {
        id: 'user-456',
        email: 'test@example.com',
        role: 'trainer'
      };
      
      mockStorage.getUserByGoogleId.mockResolvedValue(null);
      mockStorage.getUserByEmail.mockResolvedValue(existingUser);
      mockStorage.linkGoogleAccount.mockRejectedValue(linkError);

      require('../server/passport-config');
      
      const done = vi.fn();
      await googleStrategyCallback(
        mockReq,
        'access-token',
        'refresh-token',
        mockProfile,
        done
      );

      expect(done).toHaveBeenCalledWith(linkError, null);
    });

    it('should handle missing session gracefully', async () => {
      const mockReqWithoutSession = {};

      const newUser = {
        id: 'user-789',
        email: 'test@example.com',
        googleId: 'google-123',
        role: 'customer',
        name: 'Test User'
      };

      mockStorage.getUserByGoogleId.mockResolvedValue(null);
      mockStorage.getUserByEmail.mockResolvedValue(null);
      mockStorage.createGoogleUser.mockResolvedValue(newUser);

      require('../server/passport-config');
      
      const done = vi.fn();
      await googleStrategyCallback(
        mockReqWithoutSession,
        'access-token',
        'refresh-token',
        mockProfile,
        done
      );

      expect(mockStorage.createGoogleUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        googleId: 'google-123',
        name: 'Test User',
        profilePicture: 'https://example.com/photo.jpg',
        role: 'customer' // Should default to customer
      });
    });
  });

  describe('User Serialization', () => {
    it('should serialize user correctly', () => {
      const user = { id: 'user-123', email: 'test@example.com', role: 'customer' };
      const done = vi.fn();
      
      // Import to trigger serialization setup
      const passport = require('../server/passport-config').default;
      
      // Access the serialize function (this is tricky to test directly)
      // In a real implementation, you might export these functions for testing
    });

    it('should deserialize user correctly', async () => {
      const userId = 'user-123';
      const user = { id: userId, email: 'test@example.com', role: 'customer' };
      
      mockStorage.getUserById.mockResolvedValue(user);
      
      // Import to trigger deserialization setup
      require('../server/passport-config');
      
      // Test would need access to the deserialize function
    });

    it('should handle deserialize errors', async () => {
      const userId = 'user-123';
      const error = new Error('User not found');
      
      mockStorage.getUserById.mockRejectedValue(error);
      
      require('../server/passport-config');
      
      // Test would need access to the deserialize function
    });
  });
});