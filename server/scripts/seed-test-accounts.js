import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { users, customerInvitations, mealPlanAssignments, trainerMealPlans } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/fitnessmealplanner';
const pool = new Pool({ connectionString });
const db = drizzle(pool);

async function seedTestAccounts() {
  console.log('🌱 Starting test account seeding...\n');

  try {
    // Define test accounts
    const testAccounts = [
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        email: 'admin.test@evofitmeals.com',
        password: 'TestAdmin123!',
        name: 'Test Admin',
        role: 'admin'
      },
      {
        id: 'e4ae14a6-fa78-4146-be61-c8fa9a4472f5',
        email: 'trainer.test@evofitmeals.com',
        password: 'TestTrainer123!',
        name: 'Test Trainer',
        role: 'trainer'
      },
      {
        id: 'f32890cc-af72-40dc-b92e-beef32118ca0',
        email: 'customer.test@evofitmeals.com',
        password: 'TestCustomer123!',
        name: 'Test Customer',
        role: 'customer'
      }
    ];

    // Create or update each test account
    for (const account of testAccounts) {
      // Check if account exists
      const existing = await db.select().from(users).where(eq(users.email, account.email));
      
      if (existing.length > 0) {
        console.log(`✅ Account already exists: ${account.email} (${account.role})`);
        // Update password to ensure it's correct
        const hashedPassword = await bcrypt.hash(account.password, 10);
        await db.update(users)
          .set({ 
            password: hashedPassword,
            name: account.name,
            role: account.role
          })
          .where(eq(users.email, account.email));
        console.log(`   Updated password and details for ${account.email}`);
      } else {
        // Create new account
        const hashedPassword = await bcrypt.hash(account.password, 10);
        await db.insert(users).values({
          id: account.id,
          email: account.email,
          password: hashedPassword,
          name: account.name,
          role: account.role,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`✅ Created new account: ${account.email} (${account.role})`);
      }
    }

    console.log('\n📝 Creating relationships between test accounts...\n');

    // Create invitation from trainer to customer (if not exists)
    const trainerId = 'e4ae14a6-fa78-4146-be61-c8fa9a4472f5';
    const customerId = 'f32890cc-af72-40dc-b92e-beef32118ca0';
    
    const existingInvitation = await db.select().from(customerInvitations)
      .where(and(
        eq(customerInvitations.trainerId, trainerId),
        eq(customerInvitations.customerEmail, 'customer.test@evofitmeals.com')
      ));

    if (existingInvitation.length === 0) {
      await db.insert(customerInvitations).values({
        id: uuidv4(),
        trainerId: trainerId,
        customerEmail: 'customer.test@evofitmeals.com',
        token: 'test-token-' + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        usedAt: new Date(), // Mark as used
        createdAt: new Date()
      });
      console.log('✅ Created invitation from trainer to customer');
    } else {
      // Update existing invitation to ensure it's marked as used
      await db.update(customerInvitations)
        .set({ 
          usedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })
        .where(eq(customerInvitations.id, existingInvitation[0].id));
      console.log('✅ Updated existing invitation as used');
    }

    // Create a sample meal plan for the trainer (if not exists)
    const existingMealPlan = await db.select().from(trainerMealPlans)
      .where(eq(trainerMealPlans.trainerId, trainerId));

    let mealPlanId;
    if (existingMealPlan.length === 0) {
      mealPlanId = uuidv4();
      await db.insert(trainerMealPlans).values({
        id: mealPlanId,
        trainerId: trainerId,
        mealPlanData: {
          planName: 'Test Meal Plan',
          description: 'A sample meal plan for testing',
          days: 7,
          mealsPerDay: 3,
          dailyCalorieTarget: 2000,
          fitnessGoal: 'muscle_building',
          meals: []
        },
        notes: 'This is a test meal plan for development and testing purposes',
        tags: ['test', 'sample'],
        isTemplate: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Created sample meal plan for trainer');
    } else {
      mealPlanId = existingMealPlan[0].id;
      console.log('✅ Using existing meal plan');
    }

    // Create meal plan assignment from trainer to customer (if not exists)
    const existingAssignment = await db.select().from(mealPlanAssignments)
      .where(and(
        eq(mealPlanAssignments.customerId, customerId),
        eq(mealPlanAssignments.assignedBy, trainerId)
      ));

    if (existingAssignment.length === 0) {
      await db.insert(mealPlanAssignments).values({
        id: uuidv4(),
        mealPlanId: mealPlanId,
        customerId: customerId,
        assignedBy: trainerId,
        assignedAt: new Date(),
        notes: 'Test assignment for development purposes'
      });
      console.log('✅ Created meal plan assignment from trainer to customer');
    } else {
      console.log('✅ Meal plan assignment already exists');
    }

    console.log('\n🎉 Test accounts setup complete!\n');
    console.log('Test Credentials:');
    console.log('================');
    console.log('Admin:    admin.test@evofitmeals.com    / TestAdmin123!');
    console.log('Trainer:  trainer.test@evofitmeals.com  / TestTrainer123!');
    console.log('Customer: customer.test@evofitmeals.com / TestCustomer123!');
    console.log('\nRelationships:');
    console.log('- Trainer can see Customer through invitation and meal plan assignment');
    console.log('- Customer is assigned to Trainer');
    console.log('- Admin can see and manage all accounts');

  } catch (error) {
    console.error('❌ Error seeding test accounts:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the seed function
seedTestAccounts().catch(console.error);