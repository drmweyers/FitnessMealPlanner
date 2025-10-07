#!/bin/bash
# Auto-Seed Test Accounts for Docker PostgreSQL
# This script runs automatically when the postgres container starts for the first time
# It is idempotent and can be run multiple times safely

set -e

echo "=================================="
echo "Auto-Seeding Test Accounts"
echo "=================================="

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h localhost -p 5432 -U postgres; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "PostgreSQL is ready!"

# Run the seed script
echo "Running auto-seed script..."

# The seed script should be mounted at /docker-entrypoint-initdb.d/auto-seed.sql
# or we can reference it from the mounted volume
SEED_FILE="/docker-entrypoint-initdb.d/auto-seed.sql"

if [ -f "$SEED_FILE" ]; then
    echo "Found seed file at: $SEED_FILE"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$SEED_FILE"

    if [ $? -eq 0 ]; then
        echo "=================================="
        echo "Test accounts seeded successfully!"
        echo "=================================="
        echo ""
        echo "Available test accounts:"
        echo "  Admin:    admin@fitmeal.pro / AdminPass123"
        echo "  Trainer:  trainer.test@evofitmeals.com / TestTrainer123!"
        echo "  Customer: customer.test@evofitmeals.com / TestCustomer123!"
        echo ""
        echo "=================================="
    else
        echo "ERROR: Failed to seed test accounts"
        exit 1
    fi
else
    echo "WARNING: Seed file not found at $SEED_FILE"
    echo "Test accounts will need to be created manually"
fi
