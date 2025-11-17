// @ts-nocheck - Type errors suppressed
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('================================');
console.log('Verifying Seed Script');
console.log('================================');
console.log('');

// Read the seed SQL file
const seedFile = join(__dirname, 'auto-seed.sql');
console.log(`Reading seed file: ${seedFile}`);

try {
  const seedSQL = readFileSync(seedFile, 'utf-8');
  console.log(`File size: ${seedSQL.length} bytes`);
  console.log('');

  // Check for required components
  const checks = [
    {
      name: 'Admin account insertion',
      pattern: /admin@fitmeal\.pro/,
      required: true
    },
    {
      name: 'Trainer account insertion',
      pattern: /trainer\.test@evofitmeals\.com/,
      required: true
    },
    {
      name: 'Customer account insertion',
      pattern: /customer\.test@evofitmeals\.com/,
      required: true
    },
    {
      name: 'Idempotency (ON CONFLICT)',
      pattern: /ON CONFLICT.*DO UPDATE/s,
      required: true
    },
    {
      name: 'UUID generation',
      pattern: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i,
      required: true
    },
    {
      name: 'Bcrypt hashes',
      pattern: /\$2b\$10\$/,
      required: true
    },
    {
      name: 'AdminPass123 hash',
      pattern: /\$2b\$10\$Y84J1JYTx0yeozHw1ZXsqezi4L1RjqBtI06DRc2pKTJDlds8qaRxu/,
      required: true
    },
    {
      name: 'TestTrainer123! hash',
      pattern: /\$2b\$10\$7sh6W8wrOgGRM5zh9H1DHO4aNLHw3YLhc\/1Zi30VL40Xr3tU4OnDy/,
      required: true
    },
    {
      name: 'TestCustomer123! hash',
      pattern: /\$2b\$10\$ntpn4fEKnGz\/Gnbi4eoUv\.RzfbskycPl5Ln8jJjdHfuScg0W\.\/s2m/,
      required: true
    },
    {
      name: 'Table existence check',
      pattern: /information_schema\.tables/,
      required: false
    },
    {
      name: 'Trainer-Customer relationship',
      pattern: /customer_invitations/,
      required: false
    }
  ];

  console.log('Verification checks:');
  console.log('');

  let passed = 0;
  let failed = 0;

  checks.forEach(check => {
    const found = check.pattern.test(seedSQL);
    const status = found ? '✓' : (check.required ? '✗' : '○');
    const label = check.required ? 'REQUIRED' : 'OPTIONAL';

    console.log(`  ${status} ${check.name} [${label}]`);

    if (check.required && !found) {
      failed++;
    } else if (found) {
      passed++;
    }
  });

  console.log('');
  console.log('================================');

  if (failed > 0) {
    console.log(`FAILED: ${failed} required checks failed`);
    console.log('================================');
    process.exit(1);
  } else {
    console.log(`SUCCESS: All required checks passed (${passed} total)`);
    console.log('================================');
    console.log('');
    console.log('The seed script is valid and ready to use!');
    console.log('');
    console.log('To seed the database:');
    console.log('  npm run seed:test');
    console.log('');
    console.log('Or with Docker:');
    console.log('  npm run docker:dev');
  }

} catch (error) {
  console.error('ERROR: Could not read seed file');
  console.error(error);
  process.exit(1);
}
