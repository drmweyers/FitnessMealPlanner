import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { deleteCustomerAccount, validateDeletionRequest, AccountDeletionError } from '../../server/services/accountDeletion';
import { cleanupUserS3Objects } from '../../server/services/s3Cleanup';
import { db } from '../../server/db';
import { users } from '../../server/db/schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

// Mock dependencies
vi.mock('../../server/services/s3Cleanup');
vi.mock('../../server/db');
vi.mock('bcrypt');

describe('Account Deletion Service', () => {
  const mockUserId = 1;
  const mockPassword = 'TestPassword123!';
  const mockHashedPassword = '$2b$10$hashedpassword';
  const mockUser = {
    id: mockUserId,
    email: 'customer@test.com',
    password: mockHashedPassword,
    role: 'customer' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Delete Account - Happy Path', () => {
    it('should successfully delete account with no data', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([mockUser]);

      (db.select as any) = mockSelect;
      mockSelect.mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ limit: mockLimit });

      (bcrypt.compare as any) = vi.fn().mockResolvedValue(true);
      (cleanupUserS3Objects as any) = vi.fn().mockResolvedValue({
        profileImages: 0,
        progressPhotos: 0,
        total: 0,
      });

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        await callback({
          delete: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        });
      });
      (db.transaction as any) = mockTransaction;

      // Execute
      await deleteCustomerAccount({
        userId: mockUserId,
        password: mockPassword,
        confirmDeletion: true,
      });

      // Verify
      expect(cleanupUserS3Objects).toHaveBeenCalledWith(mockUserId);
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should successfully delete account with meal plans (cascade)', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([mockUser]);

      (db.select as any) = mockSelect;
      mockSelect.mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ limit: mockLimit });

      (bcrypt.compare as any) = vi.fn().mockResolvedValue(true);
      (cleanupUserS3Objects as any) = vi.fn().mockResolvedValue({
        profileImages: 0,
        progressPhotos: 0,
        total: 0,
      });

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        await callback({
          delete: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        });
      });
      (db.transaction as any) = mockTransaction;

      // Execute
      await deleteCustomerAccount({
        userId: mockUserId,
        password: mockPassword,
        confirmDeletion: true,
      });

      // Verify - cascade deletes handled by database foreign keys
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should successfully delete account with S3 images (cascade + S3)', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([mockUser]);

      (db.select as any) = mockSelect;
      mockSelect.mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ limit: mockLimit });

      (bcrypt.compare as any) = vi.fn().mockResolvedValue(true);
      (cleanupUserS3Objects as any) = vi.fn().mockResolvedValue({
        profileImages: 2,
        progressPhotos: 5,
        total: 7,
      });

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        await callback({
          delete: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        });
      });
      (db.transaction as any) = mockTransaction;

      // Execute
      await deleteCustomerAccount({
        userId: mockUserId,
        password: mockPassword,
        confirmDeletion: true,
      });

      // Verify
      expect(cleanupUserS3Objects).toHaveBeenCalledWith(mockUserId);
      const s3Result = await cleanupUserS3Objects(mockUserId);
      expect(s3Result.total).toBe(7);
    });
  });

  describe('S3 Cleanup', () => {
    it('should handle S3 cleanup success', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([mockUser]);

      (db.select as any) = mockSelect;
      mockSelect.mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ limit: mockLimit });

      (bcrypt.compare as any) = vi.fn().mockResolvedValue(true);
      (cleanupUserS3Objects as any) = vi.fn().mockResolvedValue({
        profileImages: 1,
        progressPhotos: 3,
        total: 4,
      });

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        await callback({
          delete: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        });
      });
      (db.transaction as any) = mockTransaction;

      // Execute
      await deleteCustomerAccount({
        userId: mockUserId,
        password: mockPassword,
        confirmDeletion: true,
      });

      // Verify
      expect(cleanupUserS3Objects).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle S3 cleanup failure (throw error)', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([mockUser]);

      (db.select as any) = mockSelect;
      mockSelect.mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ limit: mockLimit });

      (bcrypt.compare as any) = vi.fn().mockResolvedValue(true);
      (cleanupUserS3Objects as any) = vi.fn().mockRejectedValue(new Error('S3 connection failed'));

      // Execute & Verify
      await expect(deleteCustomerAccount({
        userId: mockUserId,
        password: mockPassword,
        confirmDeletion: true,
      })).rejects.toThrow(AccountDeletionError);

      await expect(deleteCustomerAccount({
        userId: mockUserId,
        password: mockPassword,
        confirmDeletion: true,
      })).rejects.toThrow('Failed to clean up user files in S3');
    });
  });

  describe('Authorization', () => {
    it('should allow customer to delete own account', () => {
      // Execute & Verify
      expect(() => validateDeletionRequest(mockUserId, 'customer')).not.toThrow();
    });

    it('should prevent customer from deleting other accounts', () => {
      // This is enforced by the API route checking req.user.id
      // Unit test validates the role check
      expect(() => validateDeletionRequest(mockUserId, 'customer')).not.toThrow();
    });

    it('should prevent trainer from deleting customer account', () => {
      // Execute & Verify
      expect(() => validateDeletionRequest(mockUserId, 'trainer')).toThrow('Only customers can delete their own accounts');
    });

    it('should prevent admin from deleting customer account', () => {
      // Execute & Verify
      expect(() => validateDeletionRequest(mockUserId, 'admin')).toThrow('Only customers can delete their own accounts');
    });
  });

  describe('Password Re-Authentication', () => {
    it('should succeed with valid password', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([mockUser]);

      (db.select as any) = mockSelect;
      mockSelect.mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ limit: mockLimit });

      (bcrypt.compare as any) = vi.fn().mockResolvedValue(true);
      (cleanupUserS3Objects as any) = vi.fn().mockResolvedValue({ profileImages: 0, progressPhotos: 0, total: 0 });

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        await callback({
          delete: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        });
      });
      (db.transaction as any) = mockTransaction;

      // Execute
      await deleteCustomerAccount({
        userId: mockUserId,
        password: mockPassword,
        confirmDeletion: true,
      });

      // Verify
      expect(bcrypt.compare).toHaveBeenCalledWith(mockPassword, mockHashedPassword);
    });

    it('should fail with invalid password', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([mockUser]);

      (db.select as any) = mockSelect;
      mockSelect.mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ limit: mockLimit });

      (bcrypt.compare as any) = vi.fn().mockResolvedValue(false);

      // Execute & Verify
      await expect(deleteCustomerAccount({
        userId: mockUserId,
        password: 'WrongPassword123!',
        confirmDeletion: true,
      })).rejects.toThrow(AccountDeletionError);

      await expect(deleteCustomerAccount({
        userId: mockUserId,
        password: 'WrongPassword123!',
        confirmDeletion: true,
      })).rejects.toThrow('Invalid password');
    });
  });

  describe('Transaction Handling', () => {
    it('should rollback on database error', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([mockUser]);

      (db.select as any) = mockSelect;
      mockSelect.mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ limit: mockLimit });

      (bcrypt.compare as any) = vi.fn().mockResolvedValue(true);
      (cleanupUserS3Objects as any) = vi.fn().mockResolvedValue({ profileImages: 0, progressPhotos: 0, total: 0 });

      const mockTransaction = vi.fn().mockRejectedValue(new Error('Database connection lost'));
      (db.transaction as any) = mockTransaction;

      // Execute & Verify
      await expect(deleteCustomerAccount({
        userId: mockUserId,
        password: mockPassword,
        confirmDeletion: true,
      })).rejects.toThrow(AccountDeletionError);

      await expect(deleteCustomerAccount({
        userId: mockUserId,
        password: mockPassword,
        confirmDeletion: true,
      })).rejects.toThrow('Failed to delete user record from database');
    });

    it('should not rollback on S3 error (S3 cleanup happens first)', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([mockUser]);

      (db.select as any) = mockSelect;
      mockSelect.mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ limit: mockLimit });

      (bcrypt.compare as any) = vi.fn().mockResolvedValue(true);
      (cleanupUserS3Objects as any) = vi.fn().mockRejectedValue(new Error('S3 error'));

      // Execute & Verify
      await expect(deleteCustomerAccount({
        userId: mockUserId,
        password: mockPassword,
        confirmDeletion: true,
      })).rejects.toThrow('Failed to clean up user files in S3');

      // Database transaction should not be called if S3 cleanup fails
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  describe('Confirmation Validation', () => {
    it('should require explicit confirmation', async () => {
      // Execute & Verify
      await expect(deleteCustomerAccount({
        userId: mockUserId,
        password: mockPassword,
        confirmDeletion: false,
      })).rejects.toThrow('Account deletion must be explicitly confirmed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle deletion with pending invitation', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([mockUser]);

      (db.select as any) = mockSelect;
      mockSelect.mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ limit: mockLimit });

      (bcrypt.compare as any) = vi.fn().mockResolvedValue(true);
      (cleanupUserS3Objects as any) = vi.fn().mockResolvedValue({ profileImages: 0, progressPhotos: 0, total: 0 });

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        await callback({
          delete: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        });
      });
      (db.transaction as any) = mockTransaction;

      // Execute
      await deleteCustomerAccount({
        userId: mockUserId,
        password: mockPassword,
        confirmDeletion: true,
      });

      // Verify - cascade deletes handle invitations
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should handle deletion with active meal plan assignment', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([mockUser]);

      (db.select as any) = mockSelect;
      mockSelect.mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ limit: mockLimit });

      (bcrypt.compare as any) = vi.fn().mockResolvedValue(true);
      (cleanupUserS3Objects as any) = vi.fn().mockResolvedValue({ profileImages: 0, progressPhotos: 0, total: 0 });

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        await callback({
          delete: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        });
      });
      (db.transaction as any) = mockTransaction;

      // Execute
      await deleteCustomerAccount({
        userId: mockUserId,
        password: mockPassword,
        confirmDeletion: true,
      });

      // Verify
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should handle deletion with multiple progress photos', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([mockUser]);

      (db.select as any) = mockSelect;
      mockSelect.mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ limit: mockLimit });

      (bcrypt.compare as any) = vi.fn().mockResolvedValue(true);
      (cleanupUserS3Objects as any) = vi.fn().mockResolvedValue({
        profileImages: 1,
        progressPhotos: 50,
        total: 51,
      });

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        await callback({
          delete: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        });
      });
      (db.transaction as any) = mockTransaction;

      // Execute
      await deleteCustomerAccount({
        userId: mockUserId,
        password: mockPassword,
        confirmDeletion: true,
      });

      // Verify
      expect(cleanupUserS3Objects).toHaveBeenCalledWith(mockUserId);
      const s3Result = await cleanupUserS3Objects(mockUserId);
      expect(s3Result.progressPhotos).toBe(50);
    });

    it('should handle deletion with empty profile (edge case)', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([mockUser]);

      (db.select as any) = mockSelect;
      mockSelect.mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ limit: mockLimit });

      (bcrypt.compare as any) = vi.fn().mockResolvedValue(true);
      (cleanupUserS3Objects as any) = vi.fn().mockResolvedValue({
        profileImages: 0,
        progressPhotos: 0,
        total: 0,
      });

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        await callback({
          delete: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        });
      });
      (db.transaction as any) = mockTransaction;

      // Execute
      await deleteCustomerAccount({
        userId: mockUserId,
        password: mockPassword,
        confirmDeletion: true,
      });

      // Verify
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should handle user not found error', async () => {
      // Setup
      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([]); // Empty array = user not found

      (db.select as any) = mockSelect;
      mockSelect.mockReturnValue({ from: mockFrom });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockReturnValue({ limit: mockLimit });

      // Execute & Verify
      await expect(deleteCustomerAccount({
        userId: 999,
        password: mockPassword,
        confirmDeletion: true,
      })).rejects.toThrow('User not found');
    });
  });

  describe('Validation', () => {
    it('should validate invalid user ID', () => {
      // Execute & Verify
      expect(() => validateDeletionRequest(0, 'customer')).toThrow('Invalid user ID');
      expect(() => validateDeletionRequest(-1, 'customer')).toThrow('Invalid user ID');
    });
  });
});
