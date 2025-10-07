import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index.js';
import { db } from '../../server/db.js';
import { 
  progressMeasurements, 
  progressPhotos, 
  customerGoals,
  goalMilestones,
  users 
} from '@shared/schema';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test-customer@example.com',
  password: '$2b$10$hashedPassword',
  role: 'customer' as const,
  name: 'Test Customer',
};

let testUserId: string;
let authToken: string;

describe('Progress Tracking API Tests', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.delete(progressMeasurements);
    await db.delete(progressPhotos);
    await db.delete(goalMilestones);
    await db.delete(customerGoals);
    await db.delete(users).where(eq(users.email, testUser.email));

    // Create test user
    const [user] = await db.insert(users).values(testUser).returning();
    testUserId = user.id;

    // Get auth token (simulate login)
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'testpassword123'
      });

    authToken = loginResponse.body.tokens?.accessToken || '';
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(progressMeasurements);
    await db.delete(progressPhotos);
    await db.delete(goalMilestones);
    await db.delete(customerGoals);
    await db.delete(users).where(eq(users.email, testUser.email));
  });

  describe('Progress Measurements API', () => {
    test('should create a new measurement', async () => {
      const measurementData = {
        measurementDate: new Date().toISOString(),
        weightLbs: 180.5,
        bodyFatPercentage: 15.2,
        waistCm: 32.0,
        chestCm: 42.0,
        notes: 'Feeling strong today!'
      };

      const response = await request(app)
        .post('/api/progress/measurements')
        .set('Authorization', `Bearer ${authToken}`)
        .send(measurementData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toMatchObject({
        customerId: testUserId,
        weightLbs: '180.5',
        bodyFatPercentage: '15.2',
        waistCm: '32',
        chestCm: '42',
        notes: 'Feeling strong today!'
      });

      // Verify data was saved to database
      const savedMeasurements = await db
        .select()
        .from(progressMeasurements)
        .where(eq(progressMeasurements.customerId, testUserId));

      expect(savedMeasurements).toHaveLength(1);
      expect(savedMeasurements[0].weightLbs).toBe('180.5');
    });

    test('should get all measurements for a customer', async () => {
      // Create test measurements
      const measurements = [
        {
          customerId: testUserId,
          measurementDate: new Date('2024-01-01'),
          weightLbs: '180.0',
          bodyFatPercentage: '16.0'
        },
        {
          customerId: testUserId,
          measurementDate: new Date('2024-01-15'),
          weightLbs: '178.5',
          bodyFatPercentage: '15.5'
        }
      ];

      await db.insert(progressMeasurements).values(measurements);

      const response = await request(app)
        .get('/api/progress/measurements')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(2);
      
      // Should be ordered by date descending (most recent first)
      expect(new Date(response.body.data[0].measurementDate))
        .toBeAfter(new Date(response.body.data[1].measurementDate));
    });

    test('should filter measurements by date range', async () => {
      // Create measurements across different dates
      const measurements = [
        {
          customerId: testUserId,
          measurementDate: new Date('2024-01-01'),
          weightLbs: '180.0'
        },
        {
          customerId: testUserId,
          measurementDate: new Date('2024-02-01'),
          weightLbs: '178.0'
        },
        {
          customerId: testUserId,
          measurementDate: new Date('2024-03-01'),
          weightLbs: '176.0'
        }
      ];

      await db.insert(progressMeasurements).values(measurements);

      const response = await request(app)
        .get('/api/progress/measurements')
        .query({
          startDate: '2024-01-15',
          endDate: '2024-02-15'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].weightLbs).toBe('178.0');
    });

    test('should update a measurement', async () => {
      // Create initial measurement
      const [measurement] = await db
        .insert(progressMeasurements)
        .values({
          customerId: testUserId,
          measurementDate: new Date(),
          weightLbs: '180.0'
        })
        .returning();

      const updatedData = {
        measurementDate: new Date().toISOString(),
        weightLbs: 178.5,
        bodyFatPercentage: 15.0,
        notes: 'Updated measurement'
      };

      const response = await request(app)
        .put(`/api/progress/measurements/${measurement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.weightLbs).toBe('178.5');
      expect(response.body.data.bodyFatPercentage).toBe('15');
      expect(response.body.data.notes).toBe('Updated measurement');
    });

    test('should delete a measurement', async () => {
      // Create measurement to delete
      const [measurement] = await db
        .insert(progressMeasurements)
        .values({
          customerId: testUserId,
          measurementDate: new Date(),
          weightLbs: '180.0'
        })
        .returning();

      await request(app)
        .delete(`/api/progress/measurements/${measurement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify deletion
      const remainingMeasurements = await db
        .select()
        .from(progressMeasurements)
        .where(eq(progressMeasurements.id, measurement.id));

      expect(remainingMeasurements).toHaveLength(0);
    });

    test('should not allow access without authentication', async () => {
      await request(app)
        .get('/api/progress/measurements')
        .expect(401);

      await request(app)
        .post('/api/progress/measurements')
        .send({ measurementDate: new Date().toISOString() })
        .expect(401);
    });

    test('should not allow access to other users measurements', async () => {
      // Create another user
      const otherUser = {
        email: 'other-customer@example.com',
        password: '$2b$10$hashedPassword',
        role: 'customer' as const,
        name: 'Other Customer',
      };

      const [otherUserRecord] = await db.insert(users).values(otherUser).returning();

      // Create measurement for other user
      const [otherMeasurement] = await db
        .insert(progressMeasurements)
        .values({
          customerId: otherUserRecord.id,
          measurementDate: new Date(),
          weightLbs: '200.0'
        })
        .returning();

      // Try to update other user's measurement
      await request(app)
        .put(`/api/progress/measurements/${otherMeasurement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ weightLbs: 150.0 })
        .expect(404);

      // Try to delete other user's measurement
      await request(app)
        .delete(`/api/progress/measurements/${otherMeasurement.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Clean up
      await db.delete(users).where(eq(users.id, otherUserRecord.id));
    });
  });

  describe('Customer Goals API', () => {
    test('should create a new goal', async () => {
      const goalData = {
        goalType: 'weight_loss',
        goalName: 'Lose 20 pounds',
        description: 'Goal for summer fitness',
        targetValue: 160,
        targetUnit: 'lbs',
        currentValue: 180,
        startingValue: 180,
        startDate: new Date().toISOString(),
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
        notes: 'Need to focus on cardio'
      };

      const response = await request(app)
        .post('/api/progress/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(goalData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toMatchObject({
        customerId: testUserId,
        goalType: 'weight_loss',
        goalName: 'Lose 20 pounds',
        targetValue: '160',
        targetUnit: 'lbs',
        currentValue: '180',
        startingValue: '180',
        progressPercentage: 0,
        status: 'active'
      });
    });

    test('should get all goals for a customer', async () => {
      // Create test goals
      const goals = [
        {
          customerId: testUserId,
          goalType: 'weight_loss',
          goalName: 'Lose weight',
          targetValue: '160',
          targetUnit: 'lbs',
          startDate: new Date(),
          status: 'active'
        },
        {
          customerId: testUserId,
          goalType: 'muscle_gain',
          goalName: 'Build muscle',
          targetValue: '10',
          targetUnit: 'lbs',
          startDate: new Date(),
          status: 'achieved',
          achievedDate: new Date()
        }
      ];

      await db.insert(customerGoals).values(goals);

      const response = await request(app)
        .get('/api/progress/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('milestones');
    });

    test('should filter goals by status', async () => {
      // Create goals with different statuses
      const goals = [
        {
          customerId: testUserId,
          goalType: 'weight_loss',
          goalName: 'Active Goal',
          targetValue: '160',
          targetUnit: 'lbs',
          startDate: new Date(),
          status: 'active'
        },
        {
          customerId: testUserId,
          goalType: 'muscle_gain',
          goalName: 'Achieved Goal',
          targetValue: '10',
          targetUnit: 'lbs',
          startDate: new Date(),
          status: 'achieved',
          achievedDate: new Date()
        }
      ];

      await db.insert(customerGoals).values(goals);

      const response = await request(app)
        .get('/api/progress/goals')
        .query({ status: 'active' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].goalName).toBe('Active Goal');
    });

    test('should update goal progress', async () => {
      // Create a goal
      const [goal] = await db
        .insert(customerGoals)
        .values({
          customerId: testUserId,
          goalType: 'weight_loss',
          goalName: 'Lose 20 pounds',
          targetValue: '160',
          targetUnit: 'lbs',
          currentValue: '180',
          startingValue: '180',
          startDate: new Date(),
          progressPercentage: 0,
          status: 'active'
        })
        .returning();

      const response = await request(app)
        .patch(`/api/progress/goals/${goal.id}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentValue: 170 })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.currentValue).toBe('170');
      expect(response.body.data.progressPercentage).toBe(50); // (180-170)/(180-160) = 10/20 = 50%
      expect(response.body.data.status).toBe('active');
    });

    test('should mark goal as achieved when target is reached', async () => {
      // Create a goal
      const [goal] = await db
        .insert(customerGoals)
        .values({
          customerId: testUserId,
          goalType: 'weight_loss',
          goalName: 'Lose 20 pounds',
          targetValue: '160',
          targetUnit: 'lbs',
          currentValue: '180',
          startingValue: '180',
          startDate: new Date(),
          progressPercentage: 0,
          status: 'active'
        })
        .returning();

      const response = await request(app)
        .patch(`/api/progress/goals/${goal.id}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentValue: 160 })
        .expect(200);

      expect(response.body.data.progressPercentage).toBe(100);
      expect(response.body.data.status).toBe('achieved');
      expect(response.body.data.achievedDate).toBeTruthy();
    });

    test('should validate goal data', async () => {
      // Test missing required fields
      await request(app)
        .post('/api/progress/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      // Test invalid goal type
      await request(app)
        .post('/api/progress/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          goalType: 'invalid_type',
          goalName: 'Test Goal',
          targetValue: 100,
          targetUnit: 'lbs',
          startDate: new Date().toISOString()
        })
        .expect(400);
    });
  });

  describe('Progress Photos API', () => {
    test('should get all photos for a customer', async () => {
      // Create test photos
      const photos = [
        {
          customerId: testUserId,
          photoDate: new Date('2024-01-01'),
          photoUrl: 'https://example.com/photo1.jpg',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          photoType: 'front',
          caption: 'Starting photo',
          isPrivate: true
        },
        {
          customerId: testUserId,
          photoDate: new Date('2024-02-01'),
          photoUrl: 'https://example.com/photo2.jpg',
          thumbnailUrl: 'https://example.com/thumb2.jpg',
          photoType: 'side',
          caption: '1 month progress',
          isPrivate: true
        }
      ];

      await db.insert(progressPhotos).values(photos);

      const response = await request(app)
        .get('/api/progress/photos')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(2);
      
      // Should be ordered by date descending
      expect(new Date(response.body.data[0].photoDate))
        .toBeAfter(new Date(response.body.data[1].photoDate));
    });

    test('should require authentication for photos endpoints', async () => {
      await request(app)
        .get('/api/progress/photos')
        .expect(401);

      await request(app)
        .post('/api/progress/photos')
        .expect(401);
    });

    test('should delete a photo', async () => {
      // Create a test photo
      const [photo] = await db
        .insert(progressPhotos)
        .values({
          customerId: testUserId,
          photoDate: new Date(),
          photoUrl: 'https://example.com/test-photo.jpg',
          photoType: 'front',
          isPrivate: true
        })
        .returning();

      await request(app)
        .delete(`/api/progress/photos/${photo.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify deletion
      const remainingPhotos = await db
        .select()
        .from(progressPhotos)
        .where(eq(progressPhotos.id, photo.id));

      expect(remainingPhotos).toHaveLength(0);
    });
  });

  describe('Data Validation and Security', () => {
    test('should validate measurement data types', async () => {
      const invalidData = {
        measurementDate: 'invalid-date',
        weightLbs: 'not-a-number',
        bodyFatPercentage: -5 // Invalid negative value
      };

      await request(app)
        .post('/api/progress/measurements')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    test('should prevent SQL injection in date filters', async () => {
      const maliciousQuery = "'; DROP TABLE progress_measurements; --";

      const response = await request(app)
        .get('/api/progress/measurements')
        .query({ startDate: maliciousQuery })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500); // Should handle the error gracefully

      // Verify table still exists by creating a measurement
      await request(app)
        .post('/api/progress/measurements')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          measurementDate: new Date().toISOString(),
          weightLbs: 180
        })
        .expect(201);
    });

    test('should limit data access to authenticated user only', async () => {
      // Create data for the authenticated user
      await db.insert(progressMeasurements).values({
        customerId: testUserId,
        measurementDate: new Date(),
        weightLbs: '180.0'
      });

      // Create another user and their data
      const otherUser = {
        email: 'other-user@example.com',
        password: '$2b$10$hashedPassword',
        role: 'customer' as const,
        name: 'Other User',
      };

      const [otherUserRecord] = await db.insert(users).values(otherUser).returning();
      
      await db.insert(progressMeasurements).values({
        customerId: otherUserRecord.id,
        measurementDate: new Date(),
        weightLbs: '200.0'
      });

      // Authenticated user should only see their own data
      const response = await request(app)
        .get('/api/progress/measurements')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].customerId).toBe(testUserId);
      expect(response.body.data[0].weightLbs).toBe('180.0');

      // Clean up
      await db.delete(users).where(eq(users.id, otherUserRecord.id));
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // This test would need to mock database failures
      // For now, we'll test that the API returns proper error responses
      
      const response = await request(app)
        .get('/api/progress/measurements/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');
    });

    test('should validate UUIDs in URL parameters', async () => {
      await request(app)
        .get('/api/progress/measurements/not-a-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      await request(app)
        .put('/api/progress/measurements/not-a-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ weightLbs: 180 })
        .expect(404);

      await request(app)
        .delete('/api/progress/measurements/not-a-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Business Logic Tests', () => {
    test('should calculate progress percentage correctly for weight loss goals', async () => {
      const [goal] = await db
        .insert(customerGoals)
        .values({
          customerId: testUserId,
          goalType: 'weight_loss',
          goalName: 'Lose 20 pounds',
          targetValue: '160', // Target: 160 lbs
          targetUnit: 'lbs',
          currentValue: '180', // Current: 180 lbs
          startingValue: '200', // Starting: 200 lbs
          startDate: new Date(),
          progressPercentage: 0,
          status: 'active'
        })
        .returning();

      // Update to 170 lbs (halfway to goal)
      const response = await request(app)
        .patch(`/api/progress/goals/${goal.id}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentValue: 170 })
        .expect(200);

      // Progress should be 75%: (200-170)/(200-160) = 30/40 = 75%
      expect(response.body.data.progressPercentage).toBe(75);
    });

    test('should calculate progress percentage correctly for weight gain goals', async () => {
      const [goal] = await db
        .insert(customerGoals)
        .values({
          customerId: testUserId,
          goalType: 'weight_gain',
          goalName: 'Gain 20 pounds',
          targetValue: '180', // Target: 180 lbs
          targetUnit: 'lbs',
          currentValue: '160', // Current: 160 lbs
          startingValue: '160', // Starting: 160 lbs
          startDate: new Date(),
          progressPercentage: 0,
          status: 'active'
        })
        .returning();

      // Update to 170 lbs (halfway to goal)
      const response = await request(app)
        .patch(`/api/progress/goals/${goal.id}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentValue: 170 })
        .expect(200);

      // Progress should be 50%: (170-160)/(180-160) = 10/20 = 50%
      expect(response.body.data.progressPercentage).toBe(50);
    });

    test('should handle progress percentage edge cases', async () => {
      // Test same starting and target values
      const [goal] = await db
        .insert(customerGoals)
        .values({
          customerId: testUserId,
          goalType: 'weight_loss',
          goalName: 'Maintain weight',
          targetValue: '180',
          targetUnit: 'lbs',
          currentValue: '180',
          startingValue: '180',
          startDate: new Date(),
          progressPercentage: 0,
          status: 'active'
        })
        .returning();

      const response = await request(app)
        .patch(`/api/progress/goals/${goal.id}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentValue: 180 })
        .expect(200);

      expect(response.body.data.progressPercentage).toBe(0);
    });
  });
});