#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo ""
echo "=========================================="
echo "  Docker Setup Verification"
echo "=========================================="
echo ""

# Check 1: Docker is running
print_status "Checking if Docker is running..."
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running!"
    exit 1
fi
print_success "Docker is running"

# Check 2: PostgreSQL container exists and is healthy
print_status "Checking PostgreSQL container..."
# Try both possible container names
POSTGRES_CONTAINER=$(docker ps --filter "name=fitnessmealplanner-postgres" --format "{{.Names}}" | head -1)
if [ -z "$POSTGRES_CONTAINER" ]; then
    POSTGRES_STATUS="not_found"
else
    POSTGRES_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$POSTGRES_CONTAINER" 2>/dev/null || echo "not_found")
fi
if [ "$POSTGRES_STATUS" = "healthy" ]; then
    print_success "PostgreSQL is healthy"
elif [ "$POSTGRES_STATUS" = "not_found" ]; then
    print_error "PostgreSQL container not found"
    echo "Run: npm run start:dev"
    exit 1
else
    print_error "PostgreSQL is not healthy (status: $POSTGRES_STATUS)"
    exit 1
fi

# Check 3: Redis container exists and is healthy
print_status "Checking Redis container..."
# Try both possible container names
REDIS_CONTAINER=$(docker ps --filter "name=fitnessmealplanner-redis" --format "{{.Names}}" | head -1)
if [ -z "$REDIS_CONTAINER" ]; then
    REDIS_STATUS="not_found"
else
    REDIS_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$REDIS_CONTAINER" 2>/dev/null || echo "not_found")
fi
if [ "$REDIS_STATUS" = "healthy" ]; then
    print_success "Redis is healthy"
elif [ "$REDIS_STATUS" = "not_found" ]; then
    print_error "Redis container not found"
    echo "Run: npm run start:dev"
    exit 1
else
    print_error "Redis is not healthy (status: $REDIS_STATUS)"
    exit 1
fi

# Check 4: Test accounts exist
print_status "Checking test accounts in database..."
ADMIN_EXISTS=$(docker exec "$POSTGRES_CONTAINER" psql -U postgres -d fitmeal -t -c "SELECT COUNT(*) FROM users WHERE email='admin@fitmeal.pro';" 2>/dev/null | xargs)
TRAINER_EXISTS=$(docker exec "$POSTGRES_CONTAINER" psql -U postgres -d fitmeal -t -c "SELECT COUNT(*) FROM users WHERE email='trainer.test@evofitmeals.com';" 2>/dev/null | xargs)
CUSTOMER_EXISTS=$(docker exec "$POSTGRES_CONTAINER" psql -U postgres -d fitmeal -t -c "SELECT COUNT(*) FROM users WHERE email='customer.test@evofitmeals.com';" 2>/dev/null | xargs)

if [ "$ADMIN_EXISTS" = "1" ] && [ "$TRAINER_EXISTS" = "1" ] && [ "$CUSTOMER_EXISTS" = "1" ]; then
    print_success "All test accounts exist"
else
    print_error "Some test accounts are missing"
    echo "Admin: $ADMIN_EXISTS, Trainer: $TRAINER_EXISTS, Customer: $CUSTOMER_EXISTS"
    echo "Run: npm run seed:test"
    exit 1
fi

# Check 5: Display test accounts
print_status "Displaying test accounts..."
docker exec "$POSTGRES_CONTAINER" psql -U postgres -d fitmeal -c "SELECT email, role, name, created_at FROM users WHERE email IN ('admin@fitmeal.pro', 'trainer.test@evofitmeals.com', 'customer.test@evofitmeals.com') ORDER BY role;"

echo ""
echo "=========================================="
echo "  All Checks Passed!"
echo "=========================================="
echo ""
echo "Your Docker environment is properly configured."
echo "You can now run: npm run dev"
echo ""
echo "Test Credentials:"
echo "  Admin:    admin@fitmeal.pro / AdminPass123"
echo "  Trainer:  trainer.test@evofitmeals.com / TestTrainer123!"
echo "  Customer: customer.test@evofitmeals.com / TestCustomer123!"
echo ""
