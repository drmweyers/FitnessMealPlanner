#!/bin/bash
#
# Run 3-Tier System Migrations
# Applies all tier-related database schema changes
#

set -e

echo "🚀 Running 3-Tier System Migrations..."
echo ""

# Database connection string
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/fitnessmealplanner}"

echo "📊 Migration 1/2: Adding tier system (0021)..."
psql "$DB_URL" -f migrations/0021_add_tier_system.sql
echo "✅ Tier system migration complete"
echo ""

echo "📊 Migration 2/2: Adding branding system (0022)..."
psql "$DB_URL" -f migrations/0022_add_branding_system.sql
echo "✅ Branding system migration complete"
echo ""

echo "📊 Bonus: Recipe tier system (server/db/migrations/002)..."
psql "$DB_URL" -f server/db/migrations/002-add-recipe-tier-system.sql
echo "✅ Recipe tier system complete"
echo ""

echo "🎉 All migrations applied successfully!"
echo ""
echo "📋 Verification:"
psql "$DB_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%tier%' OR table_name LIKE '%branding%' ORDER BY table_name;"
echo ""
echo "✅ 3-Tier System is ready!"
