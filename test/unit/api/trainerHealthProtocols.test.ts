/**
 * Unit Tests for Trainer Health Protocols API Endpoints
 * 
 * Tests the following endpoints:
 * - GET /api/trainer/health-protocols
 * - POST /api/trainer/health-protocols
 * - POST /api/trainer/health-protocols/assign
 * - GET /api/trainer/customers (for assignment functionality)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import trainerRouter from '../../../server/routes/trainerRoutes';
import { 
  createHealthProtocolSchema, 
  assignProtocolSchema,
  type TrainerHealthProtocol,
  type ProtocolAssignment,
  type User
} from '@shared/schema';

// Mock the database and auth modules first
vi.mock('../../../server/db', () => ({ 
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    values: vi.fn(),
    returning: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    and: vi.fn(),
  }
}));

vi.mock('../../../server/middleware/auth', () => ({
  requireAuth: vi.fn((req: any, res: any, next: any) => {
    req.user = { id: 'trainer-123', email: 'trainer@test.com', role: 'trainer' };
    next();
  }),
  requireRole: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    desc: vi.fn(),
    inArray: vi.fn(),
  };
});

// Import mocked db after mocking
const { db: mockDb } = await import('../../../server/db');

describe('Trainer Health Protocols API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/trainer', trainerRouter);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/trainer/health-protocols', () => {
    it('should fetch trainer protocols with assignment counts', async () => {
      const mockProtocols: TrainerHealthProtocol[] = [
        {
          id: 'protocol-1',
          trainerId: 'trainer-123',
          name: 'Longevity Protocol',
          description: '30-day longevity optimization',
          type: 'longevity',
          duration: 30,
          intensity: 'moderate',
          config: {
            fastingStrategy: '16:8',
            calorieRestriction: 'mild',
            antioxidantFocus: ['berries', 'leafyGreens'],
            includeAntiInflammatory: true,
            includeBrainHealth: true,
            targetServings: {
              vegetables: 5,
              antioxidantFoods: 3,
              omega3Sources: 2
            }
          },
          isTemplate: false,
          tags: ['longevity', 'anti-aging'],
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        }
      ];

      const mockAssignments: ProtocolAssignment[] = [
        {
          id: 'assignment-1',
          protocolId: 'protocol-1',
          customerId: 'customer-1',
          trainerId: 'trainer-123',
          status: 'active',
          startDate: new Date(),
          endDate: null,
          completedDate: null,
          notes: null,
          progressData: {},
          assignedAt: new Date(),
          updatedAt: new Date(),
        }
      ];

      // Setup mocks
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockProtocols)
          })
        })
      });

      // Mock the assignment query (called once per protocol)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockAssignments)
        })
      });

      const response = await request(app)
        .get('/api/trainer/health-protocols')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: 'protocol-1',
        name: 'Longevity Protocol',
        type: 'longevity',
        assignedClients: expect.arrayContaining([
          expect.objectContaining({
            id: 'customer-1',
            status: 'active'
          })
        ])
      });
    });

    it('should return empty array when trainer has no protocols', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([])
          })
        })
      });

      const response = await request(app)
        .get('/api/trainer/health-protocols')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      });

      const response = await request(app)
        .get('/api/trainer/health-protocols')
        .expect(500);

      expect(response.body).toMatchObject({
        status: 'error',
        message: 'Failed to fetch health protocols',
        code: 'SERVER_ERROR'
      });
    });
  });

  describe('POST /api/trainer/health-protocols', () => {
    const validProtocolData = {
      name: 'New Longevity Protocol',
      description: 'Advanced longevity optimization',
      type: 'longevity' as const,
      duration: 60,
      intensity: 'intensive' as const,
      config: {
        fastingStrategy: '20:4',
        calorieRestriction: 'moderate',
        antioxidantFocus: ['turmeric', 'greenTea'],
        includeAntiInflammatory: true,
        includeBrainHealth: true,
        includeHeartHealth: true,
        targetServings: {
          vegetables: 6,
          antioxidantFoods: 4,
          omega3Sources: 3
        }
      },
      tags: ['advanced', 'longevity']
    };

    it('should create a new health protocol successfully', async () => {
      const mockCreatedProtocol: TrainerHealthProtocol = {
        id: 'new-protocol-id',
        trainerId: 'trainer-123',
        ...validProtocolData,
        isTemplate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockCreatedProtocol])
        })
      });

      const response = await request(app)
        .post('/api/trainer/health-protocols')
        .send(validProtocolData)
        .expect(201);

      expect(response.body).toMatchObject({
        protocol: expect.objectContaining({
          id: 'new-protocol-id',
          name: 'New Longevity Protocol',
          type: 'longevity',
          trainerId: 'trainer-123'
        }),
        message: 'Health protocol created successfully'
      });

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should validate protocol data with Zod schema', async () => {
      const invalidProtocolData = {
        name: '', // Invalid: empty name
        type: 'invalid-type', // Invalid: wrong type
        duration: -5, // Invalid: negative duration
        intensity: 'super-intensive', // Invalid: wrong intensity
        config: {} // Invalid: missing required config
      };

      const response = await request(app)
        .post('/api/trainer/health-protocols')
        .send(invalidProtocolData)
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        message: 'Invalid request data',
        details: expect.any(Array)
      });
    });

    it('should create parasite cleanse protocol', async () => {
      const parasiteProtocolData = {
        name: 'Gentle Parasite Cleanse',
        description: '14-day gentle cleanse protocol',
        type: 'parasite_cleanse' as const,
        duration: 14,
        intensity: 'gentle' as const,
        config: {
          duration: 14,
          intensity: 'gentle',
          currentPhase: 'preparation',
          includeHerbalSupplements: true,
          dietOnlyCleanse: false,
          targetFoods: {
            antiParasitic: ['garlic', 'oregano', 'pumpkin-seeds'],
            probiotics: ['kefir', 'sauerkraut'],
            fiberRich: ['flax-seeds', 'chia-seeds'],
            excludeFoods: ['sugar', 'refined-grains']
          }
        },
        tags: ['detox', 'cleanse']
      };

      const mockCreatedProtocol: TrainerHealthProtocol = {
        id: 'parasite-protocol-id',
        trainerId: 'trainer-123',
        ...parasiteProtocolData,
        isTemplate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockCreatedProtocol])
        })
      });

      const response = await request(app)
        .post('/api/trainer/health-protocols')
        .send(parasiteProtocolData)
        .expect(201);

      expect(response.body.protocol.type).toBe('parasite_cleanse');
      expect(response.body.protocol.config.targetFoods).toBeDefined();
    });

    it('should handle database insertion errors', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database constraint error'))
        })
      });

      const response = await request(app)
        .post('/api/trainer/health-protocols')
        .send(validProtocolData)
        .expect(500);

      expect(response.body).toMatchObject({
        status: 'error',
        message: 'Failed to create health protocol',
        code: 'SERVER_ERROR'
      });
    });
  });

  describe('POST /api/trainer/health-protocols/assign', () => {
    const validAssignmentData = {
      protocolId: 'protocol-123',
      clientIds: ['client-1', 'client-2'],
      notes: 'Initial assignment for testing',
      startDate: new Date().toISOString()
    };

    beforeEach(() => {
      // Mock protocol existence check
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'protocol-123',
              trainerId: 'trainer-123',
              name: 'Test Protocol'
            }])
          })
        })
      });

      // Mock clients existence check
      const mockClients: User[] = [
        { id: 'client-1', email: 'client1@test.com', role: 'customer' } as User,
        { id: 'client-2', email: 'client2@test.com', role: 'customer' } as User
      ];
      
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockClients)
        })
      });
    });

    it('should assign protocol to multiple clients successfully', async () => {
      const mockAssignments: ProtocolAssignment[] = [
        {
          id: 'assignment-1',
          protocolId: 'protocol-123',
          customerId: 'client-1',
          trainerId: 'trainer-123',
          status: 'active',
          startDate: new Date(),
          endDate: null,
          completedDate: null,
          notes: 'Initial assignment for testing',
          progressData: {},
          assignedAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'assignment-2',
          protocolId: 'protocol-123',
          customerId: 'client-2',
          trainerId: 'trainer-123',
          status: 'active',
          startDate: new Date(),
          endDate: null,
          completedDate: null,
          notes: 'Initial assignment for testing',
          progressData: {},
          assignedAt: new Date(),
          updatedAt: new Date(),
        }
      ];

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(mockAssignments)
        })
      });

      const response = await request(app)
        .post('/api/trainer/health-protocols/assign')
        .send(validAssignmentData)
        .expect(201);

      expect(response.body).toMatchObject({
        assignments: expect.arrayContaining([
          expect.objectContaining({
            protocolId: 'protocol-123',
            customerId: 'client-1',
            trainerId: 'trainer-123'
          }),
          expect.objectContaining({
            protocolId: 'protocol-123',
            customerId: 'client-2',
            trainerId: 'trainer-123'
          })
        ]),
        message: 'Protocol assigned to 2 client(s) successfully'
      });
    });

    it('should reject assignment if protocol not found', async () => {
      // Mock protocol not found
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]) // Empty array = not found
          })
        })
      });

      const response = await request(app)
        .post('/api/trainer/health-protocols/assign')
        .send(validAssignmentData)
        .expect(404);

      expect(response.body).toMatchObject({
        status: 'error',
        message: 'Protocol not found or not authorized',
        code: 'NOT_FOUND'
      });
    });

    it('should reject assignment if protocol belongs to different trainer', async () => {
      // Mock protocol owned by different trainer
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'protocol-123',
              trainerId: 'different-trainer-456',
              name: 'Test Protocol'
            }])
          })
        })
      });

      const response = await request(app)
        .post('/api/trainer/health-protocols/assign')
        .send(validAssignmentData)
        .expect(404);

      expect(response.body).toMatchObject({
        status: 'error',
        message: 'Protocol not found or not authorized',
        code: 'NOT_FOUND'
      });
    });

    it('should reject assignment if clients not found', async () => {
      // Mock some clients not found
      const mockPartialClients: User[] = [
        { id: 'client-1', email: 'client1@test.com', role: 'customer' } as User
        // client-2 missing
      ];
      
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockPartialClients)
        })
      });

      const response = await request(app)
        .post('/api/trainer/health-protocols/assign')
        .send(validAssignmentData)
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        message: 'One or more clients not found',
        code: 'INVALID_CLIENTS'
      });
    });

    it('should validate assignment data with Zod schema', async () => {
      const invalidAssignmentData = {
        protocolId: 'invalid-uuid-format',
        clientIds: [], // Invalid: empty array
        notes: 'a'.repeat(1001) // Too long
      };

      const response = await request(app)
        .post('/api/trainer/health-protocols/assign')
        .send(invalidAssignmentData)
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        message: 'Invalid request data',
        details: expect.any(Array)
      });
    });
  });

  describe('GET /api/trainer/customers (for protocol assignment)', () => {
    it('should fetch trainer customers for protocol assignment', async () => {
      const mockCustomersWithMealPlans = [
        {
          customerId: 'customer-1',
          customerEmail: 'customer1@test.com',
          assignedAt: new Date(),
        }
      ];

      const mockCustomersWithRecipes = [
        {
          customerId: 'customer-2',
          customerEmail: 'customer2@test.com',
          assignedAt: new Date(),
        }
      ];

      // Mock the meal plans query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockCustomersWithMealPlans)
          })
        })
      });

      // Mock the recipes query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockCustomersWithRecipes)
          })
        })
      });

      const response = await request(app)
        .get('/api/trainer/customers')
        .expect(200);

      expect(response.body).toMatchObject({
        customers: expect.arrayContaining([
          expect.objectContaining({
            id: 'customer-1',
            email: 'customer1@test.com',
            role: 'customer'
          }),
          expect.objectContaining({
            id: 'customer-2',
            email: 'customer2@test.com',
            role: 'customer'
          })
        ]),
        total: 2
      });
    });

    it('should return empty list when trainer has no customers', async () => {
      // Mock empty results
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([])
          })
        })
      });

      const response = await request(app)
        .get('/api/trainer/customers')
        .expect(200);

      expect(response.body).toMatchObject({
        customers: [],
        total: 0
      });
    });
  });

  describe('Schema Validation Tests', () => {
    it('should validate createHealthProtocolSchema correctly', () => {
      const validData = {
        name: 'Test Protocol',
        description: 'A test protocol',
        type: 'longevity',
        duration: 30,
        intensity: 'moderate',
        config: { test: 'data' },
        tags: ['test', 'protocol']
      };

      const result = createHealthProtocolSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid createHealthProtocolSchema', () => {
      const invalidData = {
        name: '', // Empty name
        type: 'invalid', // Invalid type
        duration: 0, // Invalid duration
        intensity: 'super', // Invalid intensity
        config: null // Invalid config
      };

      const result = createHealthProtocolSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate assignProtocolSchema correctly', () => {
      const validData = {
        protocolId: 'valid-uuid-format',
        clientIds: ['uuid-1', 'uuid-2'],
        notes: 'Test assignment',
        startDate: new Date().toISOString()
      };

      const result = assignProtocolSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid assignProtocolSchema', () => {
      const invalidData = {
        protocolId: 'invalid-uuid',
        clientIds: [], // Empty array
        startDate: 'invalid-date'
      };

      const result = assignProtocolSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

describe('Integration Tests - Health Protocols Workflow', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/trainer', trainerRouter);
    vi.clearAllMocks();
  });

  it('should complete full protocol creation and assignment workflow', async () => {
    // Step 1: Create a protocol
    const protocolData = {
      name: 'Integration Test Protocol',
      description: 'End-to-end test protocol',
      type: 'longevity',
      duration: 21,
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
      tags: ['integration', 'test']
    };

    const mockCreatedProtocol: TrainerHealthProtocol = {
      id: 'integration-protocol-id',
      trainerId: 'trainer-123',
      ...protocolData,
      isTemplate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock protocol creation
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockCreatedProtocol])
      })
    });

    const createResponse = await request(app)
      .post('/api/trainer/health-protocols')
      .send(protocolData)
      .expect(201);

    expect(createResponse.body.protocol.id).toBe('integration-protocol-id');

    // Step 2: Fetch protocols to verify creation
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([mockCreatedProtocol])
        })
      })
    });

    const fetchResponse = await request(app)
      .get('/api/trainer/health-protocols')
      .expect(200);

    expect(fetchResponse.body).toHaveLength(1);
    expect(fetchResponse.body[0].name).toBe('Integration Test Protocol');

    // Step 3: Assign protocol to clients
    const assignmentData = {
      protocolId: 'integration-protocol-id',
      clientIds: ['client-integration-1'],
      notes: 'Integration test assignment'
    };

    // Mock protocol ownership check
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockCreatedProtocol])
        })
      })
    });

    // Mock client existence check
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{
          id: 'client-integration-1',
          email: 'client@integration.test',
          role: 'customer'
        }])
      })
    });

    // Mock assignment creation
    const mockAssignment: ProtocolAssignment = {
      id: 'integration-assignment-id',
      protocolId: 'integration-protocol-id',
      customerId: 'client-integration-1',
      trainerId: 'trainer-123',
      status: 'active',
      startDate: new Date(),
      endDate: null,
      completedDate: null,
      notes: 'Integration test assignment',
      progressData: {},
      assignedAt: new Date(),
      updatedAt: new Date(),
    };

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockAssignment])
      })
    });

    const assignResponse = await request(app)
      .post('/api/trainer/health-protocols/assign')
      .send(assignmentData)
      .expect(201);

    expect(assignResponse.body.assignments).toHaveLength(1);
    expect(assignResponse.body.assignments[0].protocolId).toBe('integration-protocol-id');
    expect(assignResponse.body.message).toContain('1 client(s) successfully');
  });
});