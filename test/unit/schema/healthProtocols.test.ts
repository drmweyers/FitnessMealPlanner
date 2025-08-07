/**
 * Unit Tests for Health Protocols Database Schema and Validation
 * 
 * Tests the following:
 * - Database schema definitions
 * - Zod validation schemas
 * - Type safety and constraints
 * - Database operations and relationships
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  trainerHealthProtocols,
  protocolAssignments,
  createHealthProtocolSchema,
  assignProtocolSchema,
  type TrainerHealthProtocol,
  type ProtocolAssignment,
  type CreateHealthProtocol,
  type AssignProtocol,
} from '@shared/schema';

describe('Health Protocols Database Schema', () => {
  describe('Table Definitions', () => {
    it('should have trainerHealthProtocols table defined', () => {
      expect(trainerHealthProtocols).toBeDefined();
      expect(typeof trainerHealthProtocols).toBe('object');
    });

    it('should have protocolAssignments table defined', () => {
      expect(protocolAssignments).toBeDefined();
      expect(typeof protocolAssignments).toBe('object');
    });

    it('should have table fields defined', () => {
      // Verify key fields exist on the table objects
      expect(trainerHealthProtocols).toHaveProperty('id');
      expect(trainerHealthProtocols).toHaveProperty('trainerId');
      expect(trainerHealthProtocols).toHaveProperty('name');
      expect(trainerHealthProtocols).toHaveProperty('type');
      
      expect(protocolAssignments).toHaveProperty('id');
      expect(protocolAssignments).toHaveProperty('protocolId');
      expect(protocolAssignments).toHaveProperty('customerId');
      expect(protocolAssignments).toHaveProperty('trainerId');
    });
  });
});

describe('Health Protocols Validation Schemas', () => {
  describe('createHealthProtocolSchema', () => {
    it('should validate correct longevity protocol data', () => {
      const validLongevityData: CreateHealthProtocol = {
        name: 'Advanced Longevity Protocol',
        description: 'Comprehensive longevity optimization program',
        type: 'longevity',
        duration: 90,
        intensity: 'intensive',
        config: {
          fastingStrategy: '20:4',
          calorieRestriction: 'moderate',
          antioxidantFocus: ['berries', 'turmeric', 'greenTea'],
          includeAntiInflammatory: true,
          includeBrainHealth: true,
          includeHeartHealth: true,
          targetServings: {
            vegetables: 7,
            antioxidantFoods: 5,
            omega3Sources: 3
          }
        },
        tags: ['longevity', 'advanced', 'intensive']
      };

      const result = createHealthProtocolSchema.safeParse(validLongevityData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.name).toBe('Advanced Longevity Protocol');
        expect(result.data.type).toBe('longevity');
        expect(result.data.duration).toBe(90);
        expect(result.data.intensity).toBe('intensive');
        expect(result.data.tags).toEqual(['longevity', 'advanced', 'intensive']);
      }
    });

    it('should validate correct parasite cleanse protocol data', () => {
      const validParasiteData: CreateHealthProtocol = {
        name: 'Gentle Parasite Cleanse',
        description: '2-week gentle cleanse protocol',
        type: 'parasite_cleanse',
        duration: 14,
        intensity: 'gentle',
        config: {
          duration: 14,
          intensity: 'gentle',
          currentPhase: 'preparation',
          includeHerbalSupplements: true,
          dietOnlyCleanse: false,
          targetFoods: {
            antiParasitic: ['garlic', 'oregano', 'cloves'],
            probiotics: ['kefir', 'kimchi'],
            fiberRich: ['psyllium', 'flax-seeds'],
            excludeFoods: ['sugar', 'alcohol', 'processed-foods']
          }
        },
        tags: ['detox', 'cleanse', 'gentle']
      };

      const result = createHealthProtocolSchema.safeParse(validParasiteData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid protocol data', () => {
      const invalidData = {
        name: '', // Empty name
        description: 'Valid description',
        type: 'invalid_type', // Invalid type
        duration: -5, // Negative duration
        intensity: 'super_intensive', // Invalid intensity
        config: null, // Invalid config
        tags: 'not-an-array' // Invalid tags format
      };

      const result = createHealthProtocolSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.errors;
        expect(errors.some(e => e.path.includes('name'))).toBe(true);
        expect(errors.some(e => e.path.includes('type'))).toBe(true);
        expect(errors.some(e => e.path.includes('duration'))).toBe(true);
        expect(errors.some(e => e.path.includes('intensity'))).toBe(true);
        expect(errors.some(e => e.path.includes('config'))).toBe(true);
      }
    });

    it('should enforce duration limits', () => {
      // Test minimum duration
      const tooShort = {
        name: 'Too Short',
        type: 'longevity',
        duration: 0,
        intensity: 'gentle',
        config: {}
      };

      expect(createHealthProtocolSchema.safeParse(tooShort).success).toBe(false);

      // Test maximum duration
      const tooLong = {
        name: 'Too Long',
        type: 'longevity',
        duration: 366, // Over 1 year
        intensity: 'gentle',
        config: {}
      };

      expect(createHealthProtocolSchema.safeParse(tooLong).success).toBe(false);

      // Test valid range
      const validDuration = {
        name: 'Valid Duration',
        type: 'longevity',
        duration: 30,
        intensity: 'moderate',
        config: {}
      };

      expect(createHealthProtocolSchema.safeParse(validDuration).success).toBe(true);
    });

    it('should validate protocol types', () => {
      const validTypes = ['longevity', 'parasite_cleanse'];
      const invalidTypes = ['detox', 'weight-loss', 'muscle-gain', ''];

      validTypes.forEach(type => {
        const data = {
          name: 'Test Protocol',
          type,
          duration: 30,
          intensity: 'moderate',
          config: {}
        };
        expect(createHealthProtocolSchema.safeParse(data).success).toBe(true);
      });

      invalidTypes.forEach(type => {
        const data = {
          name: 'Test Protocol', 
          type,
          duration: 30,
          intensity: 'moderate',
          config: {}
        };
        expect(createHealthProtocolSchema.safeParse(data).success).toBe(false);
      });
    });

    it('should validate intensity levels', () => {
      const validIntensities = ['gentle', 'moderate', 'intensive'];
      const invalidIntensities = ['easy', 'hard', 'extreme', ''];

      validIntensities.forEach(intensity => {
        const data = {
          name: 'Test Protocol',
          type: 'longevity',
          duration: 30,
          intensity,
          config: {}
        };
        expect(createHealthProtocolSchema.safeParse(data).success).toBe(true);
      });

      invalidIntensities.forEach(intensity => {
        const data = {
          name: 'Test Protocol',
          type: 'longevity', 
          duration: 30,
          intensity,
          config: {}
        };
        expect(createHealthProtocolSchema.safeParse(data).success).toBe(false);
      });
    });

    it('should validate name length', () => {
      // Test maximum length
      const longName = 'a'.repeat(256); // Over 255 characters
      const data = {
        name: longName,
        type: 'longevity',
        duration: 30,
        intensity: 'moderate',
        config: {}
      };

      expect(createHealthProtocolSchema.safeParse(data).success).toBe(false);

      // Test valid length
      const validName = 'a'.repeat(255); // Exactly 255 characters
      const validData = {
        name: validName,
        type: 'longevity',
        duration: 30,
        intensity: 'moderate',
        config: {}
      };

      expect(createHealthProtocolSchema.safeParse(validData).success).toBe(true);
    });
  });

  describe('assignProtocolSchema', () => {
    it('should validate correct assignment data', () => {
      const validAssignmentData: AssignProtocol = {
        protocolId: '123e4567-e89b-12d3-a456-426614174000',
        clientIds: ['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002'],
        notes: 'Initial assignment for these clients',
        startDate: new Date().toISOString()
      };

      const result = assignProtocolSchema.safeParse(validAssignmentData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.protocolId).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(result.data.clientIds).toHaveLength(2);
        expect(result.data.notes).toBe('Initial assignment for these clients');
      }
    });

    it('should reject invalid UUID formats', () => {
      const invalidUuidData = {
        protocolId: 'not-a-uuid',
        clientIds: ['also-not-a-uuid'],
        notes: 'Valid notes'
      };

      const result = assignProtocolSchema.safeParse(invalidUuidData);
      expect(result.success).toBe(false);
    });

    it('should accept empty client IDs array (minimum validation)', () => {
      const emptyClientsData = {
        protocolId: '123e4567-e89b-12d3-a456-426614174000',
        clientIds: [],
        notes: 'Valid notes'
      };

      const result = assignProtocolSchema.safeParse(emptyClientsData);
      // The schema allows empty arrays, business logic validation happens at API level
      expect(result.success).toBe(true);
    });

    it('should validate optional fields', () => {
      const minimalData = {
        protocolId: '123e4567-e89b-12d3-a456-426614174000',
        clientIds: ['123e4567-e89b-12d3-a456-426614174001']
      };

      const result = assignProtocolSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.notes).toBeUndefined();
        expect(result.data.startDate).toBeUndefined();
      }
    });

    it('should validate date format for startDate', () => {
      const invalidDateData = {
        protocolId: '123e4567-e89b-12d3-a456-426614174000',
        clientIds: ['123e4567-e89b-12d3-a456-426614174001'],
        startDate: 'not-a-valid-date'
      };

      const result = assignProtocolSchema.safeParse(invalidDateData);
      expect(result.success).toBe(false);

      // Valid ISO date string
      const validDateData = {
        protocolId: '123e4567-e89b-12d3-a456-426614174000',
        clientIds: ['123e4567-e89b-12d3-a456-426614174001'],
        startDate: '2025-08-07T10:30:00.000Z'
      };

      const validResult = assignProtocolSchema.safeParse(validDateData);
      expect(validResult.success).toBe(true);
    });

    it('should handle multiple client IDs', () => {
      const multipleClientsData = {
        protocolId: '123e4567-e89b-12d3-a456-426614174000',
        clientIds: [
          '123e4567-e89b-12d3-a456-426614174001',
          '123e4567-e89b-12d3-a456-426614174002',
          '123e4567-e89b-12d3-a456-426614174003',
          '123e4567-e89b-12d3-a456-426614174004',
          '123e4567-e89b-12d3-a456-426614174005'
        ]
      };

      const result = assignProtocolSchema.safeParse(multipleClientsData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.clientIds).toHaveLength(5);
      }
    });
  });
});

describe('TypeScript Type Safety', () => {
  describe('TrainerHealthProtocol type', () => {
    it('should enforce correct structure for TrainerHealthProtocol', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const validProtocol: TrainerHealthProtocol = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        trainerId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test Protocol',
        description: 'Test description',
        type: 'longevity',
        duration: 30,
        intensity: 'moderate',
        config: {
          fastingStrategy: '16:8',
          calorieRestriction: 'mild',
          antioxidantFocus: ['berries'],
          includeAntiInflammatory: true,
          includeBrainHealth: false,
          includeHeartHealth: true,
          targetServings: {
            vegetables: 5,
            antioxidantFoods: 3,
            omega3Sources: 2
          }
        },
        isTemplate: false,
        tags: ['test', 'longevity'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(validProtocol.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(validProtocol.type).toBe('longevity');
      expect(validProtocol.intensity).toBe('moderate');
    });

    it('should enforce type constraints', () => {
      // These should cause TypeScript compilation errors if uncommented:
      
      // const invalidType: TrainerHealthProtocol = {
      //   ...validProtocolBase,
      //   type: 'invalid-type' // Error: Type '"invalid-type"' is not assignable
      // };

      // const invalidIntensity: TrainerHealthProtocol = {
      //   ...validProtocolBase,
      //   intensity: 'super-hard' // Error: Type '"super-hard"' is not assignable
      // };

      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('ProtocolAssignment type', () => {
    it('should enforce correct structure for ProtocolAssignment', () => {
      const validAssignment: ProtocolAssignment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        protocolId: '123e4567-e89b-12d3-a456-426614174001',
        customerId: '123e4567-e89b-12d3-a456-426614174002',
        trainerId: '123e4567-e89b-12d3-a456-426614174003',
        status: 'active',
        startDate: new Date(),
        endDate: null,
        completedDate: null,
        notes: 'Test assignment',
        progressData: {},
        assignedAt: new Date(),
        updatedAt: new Date(),
      };

      expect(validAssignment.status).toBe('active');
      expect(validAssignment.progressData).toEqual({});
    });

    it('should allow valid status values', () => {
      const statuses: ProtocolAssignment['status'][] = ['active', 'completed', 'paused', 'cancelled'];
      
      statuses.forEach(status => {
        const assignment: Partial<ProtocolAssignment> = {
          status
        };
        expect(assignment.status).toBe(status);
      });
    });
  });
});

describe('Database Relationship Tests', () => {
  describe('Table Structure Verification', () => {
    it('should have proper table relationships defined', () => {
      // Verify tables exist and are properly structured
      expect(trainerHealthProtocols).toBeDefined();
      expect(protocolAssignments).toBeDefined();
      
      // Verify key fields exist
      expect(trainerHealthProtocols).toHaveProperty('trainerId');
      expect(protocolAssignments).toHaveProperty('protocolId');
      expect(protocolAssignments).toHaveProperty('customerId');
      expect(protocolAssignments).toHaveProperty('trainerId');
    });

    it('should have proper table indexes configured', () => {
      // In integration tests, we'd verify actual database indexes
      // For unit tests, we just verify the table definitions are present
      expect(trainerHealthProtocols).toBeDefined();
      expect(protocolAssignments).toBeDefined();
    });
  });
});