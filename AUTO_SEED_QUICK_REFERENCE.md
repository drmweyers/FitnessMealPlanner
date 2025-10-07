# Auto-Seed Quick Reference Card

## Test Account Credentials

```
Admin:    admin@fitmeal.pro           / AdminPass123
Trainer:  trainer.test@evofitmeals.com / TestTrainer123!
Customer: customer.test@evofitmeals.com / TestCustomer123!
```

**NEVER CHANGE THESE CREDENTIALS**

## Commands

### Verify (No Database Required)
```bash
npm run seed:verify
```
Fast validation of seed script syntax and structure.

### Manual Seed (Database Required)
```bash
npm run seed:test
```
Manually seeds test accounts into running database.

### Auto-Seed (Docker)
```bash
npm run docker:dev
```
Automatically seeds on first startup (empty volume only).

### Fresh Start
```bash
npm run docker:dev:stop
docker volume rm fitnessmealplanner_postgres_data
npm run docker:dev
```
Clean slate - removes all data and auto-seeds.

### Check Docker Logs
```bash
npm run docker:dev:logs
```
View seed execution logs from Docker container.

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connection refused" | `npm run docker:dev` |
| "Table does not exist" | `npm run migrate` |
| "Seed file not found" | Check `docker-entrypoint-initdb.d/` directory |
| Accounts not auto-seeding | Remove volume and restart Docker |
| Need to re-seed | `npm run seed:test` |

## File Locations

- **Main SQL:** `server/db/seeds/auto-seed.sql`
- **Docker SQL:** `docker-entrypoint-initdb.d/auto-seed.sql`
- **Bash Script:** `docker-entrypoint-initdb.d/01-seed-test-accounts.sh`
- **TypeScript Runner:** `server/db/seeds/seed-test-accounts.ts`
- **Verification:** `server/db/seeds/verify-seed-script.ts`

## Key Features

✓ Idempotent - safe to run multiple times
✓ Automatic - runs on Docker startup
✓ Manual - run anytime with npm script
✓ Verified - validation without database
✓ Complete - accounts + relationships + sample data

## Documentation

- **Full Guide:** `AUTO_SEED_TESTING_GUIDE.md`
- **Implementation:** `AUTO_SEED_IMPLEMENTATION_SUMMARY.md`
- **Seed README:** `server/db/seeds/README.md`
