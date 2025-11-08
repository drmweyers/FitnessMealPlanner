/**
 * Story 2.14: Tier Test Accounts Seeding Script
 *
 * Creates test accounts for each tier level:
 * - trainer.starter@test.com (Starter tier)
 * - trainer.professional@test.com (Professional tier)
 * - trainer.enterprise@test.com (Enterprise tier)
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/fitmeal';
const pool = new Pool({ connectionString });
const db = drizzle(pool);

async function seedTierTestAccounts() {
  console.log('🌱 Starting tier test account seeding...\n');

  try {
    // Define tier test accounts
    const tierAccounts = [
      {
        email: 'trainer.starter@test.com',
        password: 'TestPass123!',
        name: 'Starter Trainer',
        role: 'trainer' as const,
        tierLevel: 'starter' as const
      },
      {
        email: 'trainer.professional@test.com',
        password: 'TestPass123!',
        name: 'Professional Trainer',
        role: 'trainer' as const,
        tierLevel: 'professional' as const
      },
      {
        email: 'trainer.enterprise@test.com',
        password: 'TestPass123!',
        name: 'Enterprise Trainer',
        role: 'trainer' as const,
        tierLevel: 'enterprise' as const
      }
    ];

    // Create or update each tier test account
    for (const account of tierAccounts) {
      // Check if account exists
      const existing = await db.select().from(users).where(eq(users.email, account.email));

      if (existing.length > 0) {
        console.log(`✅ Account already exists: ${account.email} (${account.tierLevel})`);
        // Update to ensure correct tier level and password
        const hashedPassword = await bcrypt.hash(account.password, 10);
        await db.update(users)
          .set({
            password: hashedPassword,
            name: account.name,
            role: account.role,
            tierLevel: account.tierLevel,
            updatedAt: new Date()
          })
          .where(eq(users.email, account.email));
        console.log(`   Updated tier level to ${account.tierLevel} for ${account.email}`);
      } else {
        // Create new account
        const hashedPassword = await bcrypt.hash(account.password, 10);
        await db.insert(users).values({
          email: account.email,
          password: hashedPassword,
          name: account.name,
          role: account.role,
          tierLevel: account.tierLevel,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`✅ Created new account: ${account.email} (${account.tierLevel})`);
      }
    }

    console.log('\n🎉 Tier test accounts setup complete!\n');
    console.log('Test Credentials (All tiers):');
    console.log('=============================');
    console.log('Starter:       trainer.starter@test.com       / TestPass123! (1,000 recipes)');
    console.log('Professional:  trainer.professional@test.com  / TestPass123! (2,500 recipes)');
    console.log('Enterprise:    trainer.enterprise@test.com    / TestPass123! (4,000 recipes)');
    console.log('\nProgressive Access:');
    console.log('- Starter users see recipes 1-1,000');
    console.log('- Professional users see recipes 1-2,500 (includes all starter)');
    console.log('- Enterprise users see recipes 1-4,000 (includes all professional + starter)');

  } catch (error) {
    console.error('❌ Error seeding tier test accounts:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the seed function
seedTierTestAccounts().catch(console.error);
