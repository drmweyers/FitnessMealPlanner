import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { users } from './shared/schema.ts';

async function createSimpleAdmin() {
  try {
    // Database connection
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/fitnessmealplanner';
    const sql = postgres(connectionString, { ssl: false });
    const db = drizzle(sql);

    console.log('Creating simple admin user...');

    // Hash password
    const hashedPassword = await bcrypt.hash('Password123', 10);

    // Insert admin user
    const adminUser = await db.insert(users).values({
      email: 'test@admin.com',
      password: hashedPassword,
      role: 'admin',
      name: 'Test Admin'
    }).returning();

    console.log('✅ Simple admin user created:');
    console.log('Email: test@admin.com');
    console.log('Password: Password123');
    console.log('Role:', adminUser[0].role);

    await sql.end();
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  }
}

createSimpleAdmin();