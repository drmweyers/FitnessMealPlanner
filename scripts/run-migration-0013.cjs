const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/fitnessmealplanner'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '0013_create_missing_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    console.log('Running migration 0013_create_missing_tables.sql...');
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify tables were created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'customer_milestones',
        'meal_plan_ratings',
        'recipe_ratings',
        'customer_preferences',
        'assignment_history',
        'customer_activity_log',
        'trainer_customer_notes',
        'pdf_export_history',
        'nutritional_optimization_log',
        'meal_plan_templates'
      )
      ORDER BY table_name;
    `);
    
    console.log('\nCreated tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

  } catch (error) {
    console.error('Error running migration:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();