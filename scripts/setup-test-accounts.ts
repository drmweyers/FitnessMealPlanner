/**
 * Setup Test Accounts Script
 * 
 * This script ensures that test accounts for all roles (Admin, Trainer, Customer)
 * are properly configured in the database with the correct relationships.
 * 
 * IMPORTANT: The customer account MUST be linked to the trainer account.
 */

import { db } from '../server/db';
import { users, customerInvitations } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@fitmeal.pro',
    password: 'AdminPass123',
    role: 'admin' as const,
    name: 'Test Admin'
  },
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!',
    role: 'trainer' as const,
    name: 'Test Trainer'
  },
  customer: {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!',
    role: 'customer' as const,
    name: 'Test Customer'
  }
};

async function setupTestAccounts() {
  console.log('🚀 Setting up test accounts for production...\n');

  try {
    // Step 1: Create or update Admin account
    console.log('1️⃣ Setting up Admin account...');
    const hashedAdminPassword = await bcrypt.hash(TEST_ACCOUNTS.admin.password, 10);
    
    const existingAdmin = await db.select()
      .from(users)
      .where(eq(users.email, TEST_ACCOUNTS.admin.email));

    let adminId: string;
    if (existingAdmin.length > 0) {
      console.log('   ✓ Admin account exists, updating password...');
      await db.update(users)
        .set({ 
          password: hashedAdminPassword,
          role: TEST_ACCOUNTS.admin.role,
          name: TEST_ACCOUNTS.admin.name,
          updatedAt: new Date()
        })
        .where(eq(users.email, TEST_ACCOUNTS.admin.email));
      adminId = existingAdmin[0].id;
    } else {
      console.log('   ✓ Creating new Admin account...');
      const [newAdmin] = await db.insert(users)
        .values({
          email: TEST_ACCOUNTS.admin.email,
          password: hashedAdminPassword,
          role: TEST_ACCOUNTS.admin.role,
          name: TEST_ACCOUNTS.admin.name
        })
        .returning();
      adminId = newAdmin.id;
    }
    console.log(`   ✅ Admin account ready: ${TEST_ACCOUNTS.admin.email}\n`);

    // Step 2: Create or update Trainer account
    console.log('2️⃣ Setting up Trainer account...');
    const hashedTrainerPassword = await bcrypt.hash(TEST_ACCOUNTS.trainer.password, 10);
    
    const existingTrainer = await db.select()
      .from(users)
      .where(eq(users.email, TEST_ACCOUNTS.trainer.email));

    let trainerId: string;
    if (existingTrainer.length > 0) {
      console.log('   ✓ Trainer account exists, updating password...');
      await db.update(users)
        .set({ 
          password: hashedTrainerPassword,
          role: TEST_ACCOUNTS.trainer.role,
          name: TEST_ACCOUNTS.trainer.name,
          updatedAt: new Date()
        })
        .where(eq(users.email, TEST_ACCOUNTS.trainer.email));
      trainerId = existingTrainer[0].id;
    } else {
      console.log('   ✓ Creating new Trainer account...');
      const [newTrainer] = await db.insert(users)
        .values({
          email: TEST_ACCOUNTS.trainer.email,
          password: hashedTrainerPassword,
          role: TEST_ACCOUNTS.trainer.role,
          name: TEST_ACCOUNTS.trainer.name
        })
        .returning();
      trainerId = newTrainer.id;
    }
    console.log(`   ✅ Trainer account ready: ${TEST_ACCOUNTS.trainer.email}\n`);

    // Step 3: Create or update Customer account WITH trainer relationship
    console.log('3️⃣ Setting up Customer account with Trainer relationship...');
    const hashedCustomerPassword = await bcrypt.hash(TEST_ACCOUNTS.customer.password, 10);
    
    const existingCustomer = await db.select()
      .from(users)
      .where(eq(users.email, TEST_ACCOUNTS.customer.email));

    let customerId: string;
    if (existingCustomer.length > 0) {
      console.log('   ✓ Customer account exists, updating...');
      await db.update(users)
        .set({ 
          password: hashedCustomerPassword,
          role: TEST_ACCOUNTS.customer.role,
          name: TEST_ACCOUNTS.customer.name,
          updatedAt: new Date()
        })
        .where(eq(users.email, TEST_ACCOUNTS.customer.email));
      customerId = existingCustomer[0].id;
    } else {
      console.log('   ✓ Creating new Customer account...');
      const [newCustomer] = await db.insert(users)
        .values({
          email: TEST_ACCOUNTS.customer.email,
          password: hashedCustomerPassword,
          role: TEST_ACCOUNTS.customer.role,
          name: TEST_ACCOUNTS.customer.name
        })
        .returning();
      customerId = newCustomer.id;
    }

    // Step 4: CRITICAL - Create customer invitation to link customer to trainer
    console.log('4️⃣ Linking Customer to Trainer via invitation system...');
    
    // Check if invitation already exists and is used
    const existingInvitation = await db.select()
      .from(customerInvitations)
      .where(and(
        eq(customerInvitations.trainerId, trainerId),
        eq(customerInvitations.customerEmail, TEST_ACCOUNTS.customer.email)
      ));

    if (existingInvitation.length === 0) {
      console.log('   ✓ Creating invitation link between trainer and customer...');
      await db.insert(customerInvitations)
        .values({
          trainerId: trainerId,
          customerEmail: TEST_ACCOUNTS.customer.email,
          token: `test-token-${Date.now()}`,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          usedAt: new Date(), // Mark as already used
          createdAt: new Date()
        });
      console.log('   ✅ Customer-Trainer relationship established!\n');
    } else if (!existingInvitation[0].usedAt) {
      console.log('   ✓ Marking existing invitation as used...');
      await db.update(customerInvitations)
        .set({ usedAt: new Date() })
        .where(eq(customerInvitations.id, existingInvitation[0].id));
      console.log('   ✅ Customer-Trainer relationship confirmed!\n');
    } else {
      console.log('   ✅ Customer-Trainer relationship already exists!\n');
    }

    // Step 5: Verify the setup
    console.log('5️⃣ Verifying test account setup...\n');
    
    // Verify all accounts exist
    const allTestAccounts = await db.select({
      email: users.email,
      role: users.role,
      name: users.name
    })
    .from(users)
    .where(eq(users.email, TEST_ACCOUNTS.admin.email))
    .union(
      db.select({
        email: users.email,
        role: users.role,
        name: users.name
      })
      .from(users)
      .where(eq(users.email, TEST_ACCOUNTS.trainer.email))
    )
    .union(
      db.select({
        email: users.email,
        role: users.role,
        name: users.name
      })
      .from(users)
      .where(eq(users.email, TEST_ACCOUNTS.customer.email))
    );

    console.log('📊 Test Accounts Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    allTestAccounts.forEach(account => {
      console.log(`✓ ${account.role.toUpperCase().padEnd(10)} | ${account.email.padEnd(30)} | ${account.name}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Verify customer-trainer relationship
    const customerRelationship = await db.select({
      customerEmail: customerInvitations.customerEmail,
      trainerId: customerInvitations.trainerId,
      usedAt: customerInvitations.usedAt
    })
    .from(customerInvitations)
    .where(and(
      eq(customerInvitations.trainerId, trainerId),
      eq(customerInvitations.customerEmail, TEST_ACCOUNTS.customer.email)
    ));

    if (customerRelationship.length > 0 && customerRelationship[0].usedAt) {
      console.log('\n✅ CONFIRMED: Customer is linked to Trainer!');
      console.log(`   Customer: ${TEST_ACCOUNTS.customer.email}`);
      console.log(`   Trainer:  ${TEST_ACCOUNTS.trainer.email}`);
    } else {
      console.log('\n⚠️  WARNING: Customer-Trainer relationship may need verification');
    }

    console.log('\n🎉 Test account setup completed successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ADMIN:');
    console.log(`  Email:    ${TEST_ACCOUNTS.admin.email}`);
    console.log(`  Password: ${TEST_ACCOUNTS.admin.password}`);
    console.log('\nTRAINER:');
    console.log(`  Email:    ${TEST_ACCOUNTS.trainer.email}`);
    console.log(`  Password: ${TEST_ACCOUNTS.trainer.password}`);
    console.log('\nCUSTOMER (linked to trainer):');
    console.log(`  Email:    ${TEST_ACCOUNTS.customer.email}`);
    console.log(`  Password: ${TEST_ACCOUNTS.customer.password}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Error setting up test accounts:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
setupTestAccounts();