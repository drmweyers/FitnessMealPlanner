# Test Account Auto-Seeding System

This directory contains the automatic seeding system for test accounts.

## Overview

The auto-seeding system ensures that test accounts are automatically created when the Docker PostgreSQL container starts. It can also be run manually at any time.

## Test Accounts

The following test accounts are created:

| Role     | Email                              | Password          | UUID                                   |
|----------|-----------------------------------|-------------------|----------------------------------------|
| Admin    | admin@fitmeal.pro                 | AdminPass123      | a1b2c3d4-e5f6-7890-abcd-ef1234567890  |
| Trainer  | trainer.test@evofitmeals.com      | TestTrainer123!   | e4ae14a6-fa78-4146-be61-c8fa9a4472f5  |
| Customer | customer.test@evofitmeals.com     | TestCustomer123!  | f32890cc-af72-40dc-b92e-beef32118ca0  |

**IMPORTANT**: These credentials should NEVER be changed as they are used in automated tests and CI/CD pipelines.

## Files

### `auto-seed.sql`
The SQL script that creates the test accounts. Features:
- **Idempotent**: Can be run multiple times safely using `ON CONFLICT` clauses
- **Complete**: Creates users and relationships (trainer-customer, meal plans, etc.)
- **Safe**: Uses pre-computed bcrypt hashes (cost 10)
- **Flexible**: Checks for table existence before creating relationships

### `seed-test-accounts.ts`
TypeScript runner for manual seeding. Features:
- Reads environment variables for database connection
- Provides detailed logging
- Displays verification results
- Handles errors gracefully

## Usage

### Automatic Seeding (Docker)

When you start the PostgreSQL container with Docker, the seed script runs automatically:

```bash
npm run docker:dev
```

The scripts in `docker-entrypoint-initdb.d/` are automatically executed by the PostgreSQL Docker image on first startup.

### Manual Seeding

To manually seed test accounts (database must be running):

```bash
npm run seed:test
```

This is useful for:
- Re-creating test accounts after database reset
- Setting up a local development environment
- Ensuring test accounts exist before running tests

### Direct SQL Execution

You can also run the SQL file directly:

```bash
psql -U postgres -d fitmeal -f server/db/seeds/auto-seed.sql
```

Or from within Docker:

```bash
docker exec -i fitnessmealplanner-postgres psql -U postgres -d fitmeal < server/db/seeds/auto-seed.sql
```

## How It Works

### Docker Auto-Seeding

1. When the PostgreSQL container starts, it looks for scripts in `/docker-entrypoint-initdb.d/`
2. The `docker-compose.yml` file mounts `./docker-entrypoint-initdb.d` as a volume
3. PostgreSQL executes `01-seed-test-accounts.sh` which:
   - Waits for PostgreSQL to be ready
   - Executes `auto-seed.sql`
   - Logs success or failure
4. The seed script uses `ON CONFLICT` to update existing accounts, making it safe to run multiple times

### Manual Seeding

1. The TypeScript script reads `auto-seed.sql`
2. Connects to the database using `DATABASE_URL` from environment
3. Executes the SQL script
4. Queries and displays the created accounts
5. Shows verification results

## Idempotency

The seed script is fully idempotent:

- Uses `ON CONFLICT DO UPDATE` for user accounts
- Uses `ON CONFLICT DO NOTHING` for meal plans (to avoid overwriting)
- Checks table existence before creating relationships
- Safe to run on existing databases without data loss

## Password Hashes

Pre-computed bcrypt hashes (cost 10):

```
AdminPass123      -> $2b$10$Y84J1JYTx0yeozHw1ZXsqezi4L1RjqBtI06DRc2pKTJDlds8qaRxu
TestTrainer123!   -> $2b$10$7sh6W8wrOgGRM5zh9H1DHO4aNLHw3YLhc/1Zi30VL40Xr3tU4OnDy
TestCustomer123!  -> $2b$10$ntpn4fEKnGz/Gnbi4eoUv.RzfbskycPl5Ln8jJjdHfuScg0W./s2m
```

These hashes are hardcoded in the SQL file for consistency and portability.

## Troubleshooting

### "Could not connect to the database"

**Solution**: Start the PostgreSQL container:
```bash
npm run docker:dev
```

### "Table does not exist"

**Solution**: Run migrations first:
```bash
npm run migrate
```

### "Seed script not found"

**Solution**: Ensure you're running from the project root directory.

### Docker container doesn't seed automatically

**Possible causes**:
1. The container already has initialized data (remove the volume and restart)
2. The volume mount is not configured correctly
3. The scripts in `docker-entrypoint-initdb.d/` don't have execute permissions

**Solution**: Remove the volume and restart:
```bash
npm run docker:dev:stop
docker volume rm fitnessmealplanner_postgres_data
npm run docker:dev
```

## Integration with Tests

All automated tests rely on these test accounts:

- **E2E Tests**: Use these credentials for login flows
- **Integration Tests**: Create meal plans, recipes, etc. using these accounts
- **API Tests**: Test role-based access control with these accounts

**NEVER** change these credentials without updating all tests.

## Security Notes

- These are **test accounts only** - never use in production
- Passwords are intentionally simple for testing purposes
- UUIDs are fixed for predictable testing
- The seed script should only be run in development/test environments

## Related Files

- `docker-compose.yml` - Mounts the seed scripts as a volume
- `docker-entrypoint-initdb.d/01-seed-test-accounts.sh` - Bash script for Docker auto-seeding
- `docker-entrypoint-initdb.d/auto-seed.sql` - Copy of the seed SQL for Docker
- `package.json` - Contains the `seed:test` npm script
