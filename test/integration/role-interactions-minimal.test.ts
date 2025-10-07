/**
 * Minimal Role Interactions Integration Test
 *
 * This is a simplified version to debug authentication and setup issues
 * before running the comprehensive 100-test suite.
 */

import express, { Express } from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { registerRoutes } from '../../server/routes';
import { storage } from '../../server/storage';
import { hashPassword } from '../../server/auth';

describe('Minimal Role Interactions Test', () => {
    let app: Express;
    let server: any;
    let agent: request.SuperTest<request.Test>;

    beforeAll(async () => {
        // Set minimal Google OAuth env vars to prevent initialization errors
        if (!process.env.GOOGLE_CLIENT_ID) {
            process.env.GOOGLE_CLIENT_ID = 'test-client-id';
        }
        if (!process.env.GOOGLE_CLIENT_SECRET) {
            process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
        }

        // Set up database URL for testing
        if (!process.env.DATABASE_URL) {
            process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/fitmeal';
        }

        // Set development mode for proper SSL configuration
        process.env.NODE_ENV = 'development';

        // Setup Express app
        app = express();
        app.use(express.json());
        server = await registerRoutes(app);
        agent = request(app);
    });

    afterAll(async () => {
        if (server) {
            server.close();
        }
    });

    it('should create and authenticate test users', async () => {
        // Test credentials
        const testAdmin = {
            email: `test-admin-minimal-${Date.now()}@fitmeal.pro`,
            password: 'AdminPass123!',
            role: 'admin' as const
        };

        const testTrainer = {
            email: `test-trainer-minimal-${Date.now()}@fitmeal.pro`,
            password: 'TrainerPass123!',
            role: 'trainer' as const
        };

        const testCustomer = {
            email: `test-customer-minimal-${Date.now()}@fitmeal.pro`,
            password: 'CustomerPass123!',
            role: 'customer' as const
        };

        // Create users
        console.log('Creating admin user...');
        console.log('Test admin email:', testAdmin.email);
        console.log('Test admin password length:', testAdmin.password.length);

        try {
            const hashedPassword = await hashPassword(testAdmin.password);
            console.log('Password hashed successfully');

            const userData = {
                email: testAdmin.email,
                password: hashedPassword,
                role: testAdmin.role,
                name: 'Test Admin'
            };
            console.log('User data prepared:', userData);

            const adminUser = await storage.createUser(userData);
            console.log('Admin user created:', adminUser);
            console.log('Admin user type:', typeof adminUser);

            expect(adminUser).toBeTruthy();
            expect(adminUser).toHaveProperty('id');
            expect(adminUser.role).toBe('admin');
        } catch (error) {
            console.error('Failed to create admin user:', error);
            console.error('Error type:', typeof error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            throw error;
        }

        console.log('Creating trainer user...');
        const trainerUser = await storage.createUser({
            email: testTrainer.email,
            password: await hashPassword(testTrainer.password),
            role: testTrainer.role,
            name: 'Test Trainer'
        });
        expect(trainerUser).toHaveProperty('id');
        expect(trainerUser.role).toBe('trainer');

        console.log('Creating customer user...');
        const customerUser = await storage.createUser({
            email: testCustomer.email,
            password: await hashPassword(testCustomer.password),
            role: testCustomer.role,
            name: 'Test Customer'
        });
        expect(customerUser).toHaveProperty('id');
        expect(customerUser.role).toBe('customer');

        // Test login for admin
        console.log('Testing admin login...');
        const adminLoginRes = await agent
            .post('/api/auth/login')
            .send({
                email: testAdmin.email,
                password: testAdmin.password
            })
            .expect(200);

        expect(adminLoginRes.body).toHaveProperty('data');
        expect(adminLoginRes.body.data).toHaveProperty('accessToken');
        expect(adminLoginRes.body.data.user.role).toBe('admin');

        const adminToken = adminLoginRes.body.data.accessToken;

        // Test admin can access admin endpoint
        console.log('Testing admin access...');
        const adminStatsRes = await agent
            .get('/api/admin/stats')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(adminStatsRes.body).toHaveProperty('total');

        // Test trainer login
        console.log('Testing trainer login...');
        const trainerLoginRes = await agent
            .post('/api/auth/login')
            .send({
                email: testTrainer.email,
                password: testTrainer.password
            })
            .expect(200);

        expect(trainerLoginRes.body.data.user.role).toBe('trainer');
        const trainerToken = trainerLoginRes.body.data.accessToken;

        // Test trainer can access trainer endpoint
        console.log('Testing trainer access...');
        const trainerStatsRes = await agent
            .get('/api/trainer/profile/stats')
            .set('Authorization', `Bearer ${trainerToken}`)
            .expect(200);

        expect(trainerStatsRes.body).toHaveProperty('totalClients');

        // Test customer login
        console.log('Testing customer login...');
        const customerLoginRes = await agent
            .post('/api/auth/login')
            .send({
                email: testCustomer.email,
                password: testCustomer.password
            })
            .expect(200);

        expect(customerLoginRes.body.data.user.role).toBe('customer');
        const customerToken = customerLoginRes.body.data.accessToken;

        // Test customer can access customer endpoint
        console.log('Testing customer access...');
        const customerStatsRes = await agent
            .get('/api/customer/profile/stats')
            .set('Authorization', `Bearer ${customerToken}`)
            .expect(200);

        expect(customerStatsRes.body).toHaveProperty('totalMealPlans');

        // Test role restrictions
        console.log('Testing role restrictions...');

        // Trainer should not access admin endpoints
        await agent
            .get('/api/admin/stats')
            .set('Authorization', `Bearer ${trainerToken}`)
            .expect(403);

        // Customer should not access trainer endpoints
        await agent
            .get('/api/trainer/customers')
            .set('Authorization', `Bearer ${customerToken}`)
            .expect(403);

        console.log('All basic role interaction tests passed!');
    });

    it('should handle inter-role operations', async () => {
        console.log('Testing inter-role operations...');

        // Create test users for inter-role testing
        const adminUser = await storage.createUser({
            email: `inter-admin-${Date.now()}@fitmeal.pro`,
            password: await hashPassword('AdminPass123!'),
            role: 'admin',
            name: 'Inter Admin'
        });

        const trainerUser = await storage.createUser({
            email: `inter-trainer-${Date.now()}@fitmeal.pro`,
            password: await hashPassword('TrainerPass123!'),
            role: 'trainer',
            name: 'Inter Trainer'
        });

        const customerUser = await storage.createUser({
            email: `inter-customer-${Date.now()}@fitmeal.pro`,
            password: await hashPassword('CustomerPass123!'),
            role: 'customer',
            name: 'Inter Customer'
        });

        // Login all users
        const adminLoginRes = await agent.post('/api/auth/login').send({
            email: adminUser.email,
            password: 'AdminPass123!'
        }).expect(200);

        const trainerLoginRes = await agent.post('/api/auth/login').send({
            email: trainerUser.email,
            password: 'TrainerPass123!'
        }).expect(200);

        const customerLoginRes = await agent.post('/api/auth/login').send({
            email: customerUser.email,
            password: 'CustomerPass123!'
        }).expect(200);

        const adminToken = adminLoginRes.body.data.accessToken;
        const trainerToken = trainerLoginRes.body.data.accessToken;
        const customerToken = customerLoginRes.body.data.accessToken;

        // Test admin can view all customers
        const adminCustomersRes = await agent
            .get('/api/admin/customers')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(adminCustomersRes.body).toHaveProperty('customers');
        expect(Array.isArray(adminCustomersRes.body.customers)).toBe(true);

        // Test trainer can create meal plans
        const mealPlanData = {
            id: `test-plan-${Date.now()}`,
            planName: 'Test Interaction Plan',
            fitnessGoal: 'weight_loss',
            dailyCalorieTarget: 2000,
            days: 7,
            mealsPerDay: 3,
            generatedBy: trainerUser.id,
            createdAt: new Date(),
            meals: []
        };

        const trainerMealPlanRes = await agent
            .post('/api/trainer/meal-plans')
            .set('Authorization', `Bearer ${trainerToken}`)
            .send({ mealPlanData })
            .expect(201);

        expect(trainerMealPlanRes.body).toHaveProperty('mealPlan');
        expect(trainerMealPlanRes.body.mealPlan).toHaveProperty('id');

        // Test admin can export data
        const adminExportRes = await agent
            .get('/api/admin/export?type=users')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(adminExportRes.body).toHaveProperty('users');
        expect(adminExportRes.body.exportType).toBe('users');

        console.log('Inter-role operations test passed!');
    });
});