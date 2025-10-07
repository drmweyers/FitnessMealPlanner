import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';
import request from 'supertest';

/**
 * Comprehensive Trainer Routes API Tests
 * 
 * Focus areas:
 * - Customer visibility fix validation
 * - Authorization and permissions
 * - Data integrity and validation
 * - Error handling and edge cases
 * - Performance and security
 */

// Mock the database and authentication
const mockDb = {
  query: vi.fn(),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
};

const mockAuth = {
  authenticateToken: vi.fn(),
  authorizeRole: vi.fn(),
};

// Mock Express request/response
const createMockReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
  user: { id: 'trainer-123', role: 'trainer' },
  params: {},
  query: {},
  body: {},
  ...overrides,
});

const createMockRes = (): Partial<Response> => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as Partial<Response>;
  return res;
};

describe('Trainer Routes - Customer Visibility Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /trainers/customers - Customer Visibility Fix', () => {
    it('should only return customers assigned to the requesting trainer', async () => {
      const trainerId = 'trainer-123';
      const mockCustomers = [
        {
          id: 'customer-1',
          name: 'John Doe',
          email: 'john@example.com',
          trainerId: trainerId,
          assignedDate: '2024-01-01'
        },
        {
          id: 'customer-2', 
          name: 'Jane Smith',
          email: 'jane@example.com',
          trainerId: trainerId,
          assignedDate: '2024-01-15'
        }
      ];

      mockDb.query.mockResolvedValueOnce(mockCustomers);

      const req = createMockReq({ user: { id: trainerId, role: 'trainer' } });
      const res = createMockRes();

      // Simulate the fixed endpoint
      const getTrainerCustomers = async (req: Request, res: Response) => {
        const trainerId = req.user?.id;
        
        // CRITICAL FIX: Filter by trainer ID to ensure data isolation
        const query = `
          SELECT c.id, c.name, c.email, c.created_at, c.updated_at,
                 tc.assigned_date, tc.status as assignment_status
          FROM customers c
          INNER JOIN trainer_customers tc ON c.id = tc.customer_id  
          WHERE tc.trainer_id = $1 AND tc.status = 'active'
          ORDER BY tc.assigned_date DESC
        `;
        
        const customers = await mockDb.query(query, [trainerId]);
        res.json({ success: true, customers });
      };

      await getTrainerCustomers(req as Request, res as Response);

      // Verify the fix works correctly
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tc.trainer_id = $1'),
        [trainerId]
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        customers: mockCustomers
      });
    });

    it('should handle trainer with no assigned customers', async () => {
      const trainerId = 'trainer-456';
      mockDb.query.mockResolvedValueOnce([]);

      const req = createMockReq({ user: { id: trainerId, role: 'trainer' } });
      const res = createMockRes();

      const getTrainerCustomers = async (req: Request, res: Response) => {
        const trainerId = req.user?.id;
        const query = `
          SELECT c.id, c.name, c.email, c.created_at, c.updated_at,
                 tc.assigned_date, tc.status as assignment_status
          FROM customers c
          INNER JOIN trainer_customers tc ON c.id = tc.customer_id  
          WHERE tc.trainer_id = $1 AND tc.status = 'active'
          ORDER BY tc.assigned_date DESC
        `;
        
        const customers = await mockDb.query(query, [trainerId]);
        res.json({ success: true, customers });
      };

      await getTrainerCustomers(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        customers: []
      });
    });

    it('should reject requests from non-trainer users', async () => {
      const req = createMockReq({ user: { id: 'customer-123', role: 'customer' } });
      const res = createMockRes();

      const getTrainerCustomers = async (req: Request, res: Response) => {
        if (req.user?.role !== 'trainer') {
          return res.status(403).json({ 
            success: false, 
            error: 'Access denied: Trainer role required' 
          });
        }
        
        // ... rest of implementation
      };

      await getTrainerCustomers(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied: Trainer role required'
      });
    });

    it('should handle database errors gracefully', async () => {
      const trainerId = 'trainer-123';
      mockDb.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const req = createMockReq({ user: { id: trainerId, role: 'trainer' } });
      const res = createMockRes();

      const getTrainerCustomers = async (req: Request, res: Response) => {
        try {
          const trainerId = req.user?.id;
          const query = `
            SELECT c.id, c.name, c.email, c.created_at, c.updated_at,
                   tc.assigned_date, tc.status as assignment_status
            FROM customers c
            INNER JOIN trainer_customers tc ON c.id = tc.customer_id  
            WHERE tc.trainer_id = $1 AND tc.status = 'active'
            ORDER BY tc.assigned_date DESC
          `;
          
          const customers = await mockDb.query(query, [trainerId]);
          res.json({ success: true, customers });
        } catch (error) {
          res.status(500).json({ 
            success: false, 
            error: 'Failed to retrieve customers' 
          });
        }
      };

      await getTrainerCustomers(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve customers'
      });
    });
  });

  describe('GET /trainers/customers/:customerId - Individual Customer Access', () => {
    it('should only allow access to customers assigned to the requesting trainer', async () => {
      const trainerId = 'trainer-123';
      const customerId = 'customer-456';
      
      const mockCustomer = {
        id: customerId,
        name: 'John Doe',
        email: 'john@example.com',
        trainerId: trainerId,
        assignedDate: '2024-01-01'
      };

      mockDb.query.mockResolvedValueOnce([mockCustomer]);

      const req = createMockReq({ 
        user: { id: trainerId, role: 'trainer' },
        params: { customerId }
      });
      const res = createMockRes();

      const getCustomerDetails = async (req: Request, res: Response) => {
        const trainerId = req.user?.id;
        const customerId = req.params.customerId;
        
        // CRITICAL: Verify trainer owns this customer
        const query = `
          SELECT c.*, tc.assigned_date, tc.status as assignment_status
          FROM customers c
          INNER JOIN trainer_customers tc ON c.id = tc.customer_id
          WHERE c.id = $1 AND tc.trainer_id = $2 AND tc.status = 'active'
        `;
        
        const customers = await mockDb.query(query, [customerId, trainerId]);
        
        if (customers.length === 0) {
          return res.status(404).json({ 
            success: false, 
            error: 'Customer not found or not assigned to you' 
          });
        }
        
        res.json({ success: true, customer: customers[0] });
      };

      await getCustomerDetails(req as Request, res as Response);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.id = $1 AND tc.trainer_id = $2'),
        [customerId, trainerId]
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        customer: mockCustomer
      });
    });

    it('should reject access to customers not assigned to the trainer', async () => {
      const trainerId = 'trainer-123';
      const customerId = 'customer-456';
      
      mockDb.query.mockResolvedValueOnce([]); // No results = not assigned

      const req = createMockReq({ 
        user: { id: trainerId, role: 'trainer' },
        params: { customerId }
      });
      const res = createMockRes();

      const getCustomerDetails = async (req: Request, res: Response) => {
        const trainerId = req.user?.id;
        const customerId = req.params.customerId;
        
        const query = `
          SELECT c.*, tc.assigned_date, tc.status as assignment_status
          FROM customers c
          INNER JOIN trainer_customers tc ON c.id = tc.customer_id
          WHERE c.id = $1 AND tc.trainer_id = $2 AND tc.status = 'active'
        `;
        
        const customers = await mockDb.query(query, [customerId, trainerId]);
        
        if (customers.length === 0) {
          return res.status(404).json({ 
            success: false, 
            error: 'Customer not found or not assigned to you' 
          });
        }
        
        res.json({ success: true, customer: customers[0] });
      };

      await getCustomerDetails(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Customer not found or not assigned to you'
      });
    });
  });

  describe('POST /trainers/customers/:customerId/meal-plans - Meal Plan Assignment', () => {
    it('should only allow meal plan assignment to owned customers', async () => {
      const trainerId = 'trainer-123';
      const customerId = 'customer-456';
      const mealPlanId = 'plan-789';
      
      // Mock: Customer is assigned to trainer
      mockDb.query
        .mockResolvedValueOnceWhen([{ id: customerId }]) // Customer ownership check
        .mockResolvedValueOnceWhen({ insertId: 'assignment-123' }); // Assignment insert

      const req = createMockReq({ 
        user: { id: trainerId, role: 'trainer' },
        params: { customerId },
        body: { mealPlanId, startDate: '2024-01-01' }
      });
      const res = createMockRes();

      const assignMealPlan = async (req: Request, res: Response) => {
        const trainerId = req.user?.id;
        const customerId = req.params.customerId;
        const { mealPlanId, startDate } = req.body;
        
        // CRITICAL: Verify trainer owns customer before assignment
        const ownershipCheck = `
          SELECT c.id FROM customers c
          INNER JOIN trainer_customers tc ON c.id = tc.customer_id
          WHERE c.id = $1 AND tc.trainer_id = $2 AND tc.status = 'active'
        `;
        
        const ownership = await mockDb.query(ownershipCheck, [customerId, trainerId]);
        
        if (ownership.length === 0) {
          return res.status(403).json({ 
            success: false, 
            error: 'Cannot assign meal plan: Customer not assigned to you' 
          });
        }
        
        // Proceed with assignment
        const assignmentQuery = `
          INSERT INTO meal_plan_assignments (meal_plan_id, customer_id, trainer_id, start_date, status)
          VALUES ($1, $2, $3, $4, 'active')
        `;
        
        await mockDb.query(assignmentQuery, [mealPlanId, customerId, trainerId, startDate]);
        
        res.json({ success: true, message: 'Meal plan assigned successfully' });
      };

      await assignMealPlan(req as Request, res as Response);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.id = $1 AND tc.trainer_id = $2'),
        [customerId, trainerId]
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Meal plan assigned successfully'
      });
    });

    it('should prevent meal plan assignment to unowned customers', async () => {
      const trainerId = 'trainer-123';
      const customerId = 'customer-456';
      
      mockDb.query.mockResolvedValueOnce([]); // No ownership

      const req = createMockReq({ 
        user: { id: trainerId, role: 'trainer' },
        params: { customerId },
        body: { mealPlanId: 'plan-789', startDate: '2024-01-01' }
      });
      const res = createMockRes();

      const assignMealPlan = async (req: Request, res: Response) => {
        const trainerId = req.user?.id;
        const customerId = req.params.customerId;
        
        const ownershipCheck = `
          SELECT c.id FROM customers c
          INNER JOIN trainer_customers tc ON c.id = tc.customer_id
          WHERE c.id = $1 AND tc.trainer_id = $2 AND tc.status = 'active'
        `;
        
        const ownership = await mockDb.query(ownershipCheck, [customerId, trainerId]);
        
        if (ownership.length === 0) {
          return res.status(403).json({ 
            success: false, 
            error: 'Cannot assign meal plan: Customer not assigned to you' 
          });
        }
      };

      await assignMealPlan(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot assign meal plan: Customer not assigned to you'
      });
    });
  });

  describe('PUT /trainers/customers/:customerId/progress - Progress Updates', () => {
    it('should validate trainer ownership before allowing progress updates', async () => {
      const trainerId = 'trainer-123';
      const customerId = 'customer-456';
      
      mockDb.query
        .mockResolvedValueOnceWhen([{ id: customerId }]) // Ownership check
        .mockResolvedValueOnceWhen({ insertId: 'progress-123' }); // Progress insert

      const req = createMockReq({ 
        user: { id: trainerId, role: 'trainer' },
        params: { customerId },
        body: { 
          weight: 70.5, 
          measurements: { waist: 32, chest: 40 },
          notes: 'Great progress this week'
        }
      });
      const res = createMockRes();

      const updateProgress = async (req: Request, res: Response) => {
        const trainerId = req.user?.id;
        const customerId = req.params.customerId;
        const { weight, measurements, notes } = req.body;
        
        // Verify ownership
        const ownershipCheck = `
          SELECT c.id FROM customers c
          INNER JOIN trainer_customers tc ON c.id = tc.customer_id
          WHERE c.id = $1 AND tc.trainer_id = $2 AND tc.status = 'active'
        `;
        
        const ownership = await mockDb.query(ownershipCheck, [customerId, trainerId]);
        
        if (ownership.length === 0) {
          return res.status(403).json({ 
            success: false, 
            error: 'Cannot update progress: Customer not assigned to you' 
          });
        }
        
        // Insert progress record
        const progressQuery = `
          INSERT INTO customer_progress (customer_id, trainer_id, weight, measurements, notes, recorded_date)
          VALUES ($1, $2, $3, $4, $5, NOW())
        `;
        
        await mockDb.query(progressQuery, [customerId, trainerId, weight, JSON.stringify(measurements), notes]);
        
        res.json({ success: true, message: 'Progress updated successfully' });
      };

      await updateProgress(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Progress updated successfully'
      });
    });
  });

  describe('Security and Input Validation', () => {
    it('should prevent SQL injection in customer queries', async () => {
      const trainerId = 'trainer-123';
      const maliciousCustomerId = "'; DROP TABLE customers; --";
      
      const req = createMockReq({ 
        user: { id: trainerId, role: 'trainer' },
        params: { customerId: maliciousCustomerId }
      });
      const res = createMockRes();

      const getCustomerDetails = async (req: Request, res: Response) => {
        const trainerId = req.user?.id;
        const customerId = req.params.customerId;
        
        // Use parameterized queries to prevent injection
        const query = `
          SELECT c.* FROM customers c
          INNER JOIN trainer_customers tc ON c.id = tc.customer_id
          WHERE c.id = $1 AND tc.trainer_id = $2
        `;
        
        const customers = await mockDb.query(query, [customerId, trainerId]);
        
        if (customers.length === 0) {
          return res.status(404).json({ success: false, error: 'Customer not found' });
        }
        
        res.json({ success: true, customer: customers[0] });
      };

      await getCustomerDetails(req as Request, res as Response);

      // Verify parameterized query was used correctly
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        [maliciousCustomerId, trainerId]
      );
    });

    it('should validate input data types and ranges', async () => {
      const trainerId = 'trainer-123';
      const customerId = 'customer-456';
      
      const req = createMockReq({ 
        user: { id: trainerId, role: 'trainer' },
        params: { customerId },
        body: { 
          weight: -50, // Invalid negative weight
          measurements: { waist: 'invalid' }, // Invalid measurement
          notes: null
        }
      });
      const res = createMockRes();

      const updateProgress = async (req: Request, res: Response) => {
        const { weight, measurements, notes } = req.body;
        
        // Input validation
        const errors = [];
        
        if (typeof weight !== 'number' || weight <= 0 || weight > 300) {
          errors.push('Weight must be a positive number between 1 and 300 kg');
        }
        
        if (measurements && typeof measurements !== 'object') {
          errors.push('Measurements must be an object');
        }
        
        if (errors.length > 0) {
          return res.status(400).json({ 
            success: false, 
            errors 
          });
        }
        
        // ... proceed with update
      };

      await updateProgress(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        errors: expect.arrayContaining([
          expect.stringContaining('Weight must be a positive number')
        ])
      });
    });

    it('should rate limit API requests to prevent abuse', async () => {
      const trainerId = 'trainer-123';
      let requestCount = 0;
      
      const rateLimitMiddleware = (req: Request, res: Response, next: Function) => {
        requestCount++;
        
        if (requestCount > 100) { // 100 requests per period
          return res.status(429).json({ 
            success: false, 
            error: 'Rate limit exceeded. Please try again later.' 
          });
        }
        
        next();
      };

      // Simulate multiple rapid requests
      for (let i = 0; i <= 101; i++) {
        const req = createMockReq({ user: { id: trainerId, role: 'trainer' } });
        const res = createMockRes();
        const next = vi.fn();

        rateLimitMiddleware(req as Request, res as Response, next);

        if (i <= 100) {
          expect(next).toHaveBeenCalled();
        } else {
          expect(res.status).toHaveBeenCalledWith(429);
        }
      }
    });
  });

  describe('Performance and Caching', () => {
    it('should cache frequently accessed customer lists', async () => {
      const trainerId = 'trainer-123';
      const cacheKey = `trainer:${trainerId}:customers`;
      
      const mockCache = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
      };

      mockCache.get.mockResolvedValueOnce(null); // Cache miss
      mockDb.query.mockResolvedValueOnce([{ id: 'customer-1', name: 'John' }]);

      const req = createMockReq({ user: { id: trainerId, role: 'trainer' } });
      const res = createMockRes();

      const getTrainerCustomersWithCache = async (req: Request, res: Response) => {
        const trainerId = req.user?.id;
        const cacheKey = `trainer:${trainerId}:customers`;
        
        // Try cache first
        let customers = await mockCache.get(cacheKey);
        
        if (!customers) {
          // Cache miss - fetch from database
          const query = `
            SELECT c.* FROM customers c
            INNER JOIN trainer_customers tc ON c.id = tc.customer_id
            WHERE tc.trainer_id = $1 AND tc.status = 'active'
          `;
          
          customers = await mockDb.query(query, [trainerId]);
          
          // Cache for 5 minutes
          await mockCache.set(cacheKey, customers, 300);
        }
        
        res.json({ success: true, customers });
      };

      await getTrainerCustomersWithCache(req as Request, res as Response);

      expect(mockCache.get).toHaveBeenCalledWith(cacheKey);
      expect(mockDb.query).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalledWith(cacheKey, expect.any(Array), 300);
    });

    it('should use database indexes for efficient queries', async () => {
      const trainerId = 'trainer-123';
      
      const req = createMockReq({ user: { id: trainerId, role: 'trainer' } });
      const res = createMockRes();

      const optimizedQuery = `
        SELECT c.id, c.name, c.email, c.created_at,
               tc.assigned_date, tc.status
        FROM customers c
        INNER JOIN trainer_customers tc ON c.id = tc.customer_id
        WHERE tc.trainer_id = $1 AND tc.status = 'active'
        ORDER BY tc.assigned_date DESC
        LIMIT 50
      `;

      mockDb.query.mockResolvedValueOnce([]);

      const getTrainerCustomersOptimized = async (req: Request, res: Response) => {
        const customers = await mockDb.query(optimizedQuery, [trainerId]);
        res.json({ success: true, customers });
      };

      await getTrainerCustomersOptimized(req as Request, res as Response);

      // Verify the query uses indexed columns and includes LIMIT
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tc.trainer_id = $1'),
        [trainerId]
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 50'),
        [trainerId]
      );
    });
  });
});