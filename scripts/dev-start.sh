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

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Print banner
echo ""
echo "=========================================="
echo "  FitMeal Pro Development Startup"
echo "=========================================="
echo ""

# Step 1: Check if Docker is running
print_status "Checking if Docker is running..."
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running!"
    print_status "Please start Docker Desktop and try again."
    exit 1
fi
print_success "Docker is running"

# Step 2: Check if containers are already running
print_status "Checking existing containers..."
EXISTING_CONTAINERS=$(docker ps -a --filter "name=fitnessmealplanner" --format "{{.Names}}" | wc -l)
if [ "$EXISTING_CONTAINERS" -gt 0 ]; then
    print_warning "Found existing FitnessMealPlanner containers"
    docker ps -a --filter "name=fitnessmealplanner" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    read -p "Do you want to stop and remove them? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Stopping and removing existing containers..."
        docker-compose --profile dev down -v
        print_success "Containers removed"
    fi
fi

# Step 3: Start Docker Compose with dev profile
print_status "Starting Docker containers..."
docker-compose --profile dev up -d

# Step 4: Wait for PostgreSQL to be healthy
print_status "Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
POSTGRES_HEALTHY=false

# Find the PostgreSQL container name dynamically
POSTGRES_CONTAINER=$(docker ps --filter "name=fitnessmealplanner-postgres" --format "{{.Names}}" | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    print_error "PostgreSQL container not found!"
    exit 1
fi

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$POSTGRES_CONTAINER" 2>/dev/null || echo "not_found")

    if [ "$HEALTH_STATUS" = "healthy" ]; then
        POSTGRES_HEALTHY=true
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2
done

echo ""

if [ "$POSTGRES_HEALTHY" = false ]; then
    print_error "PostgreSQL failed to become healthy after $((MAX_RETRIES * 2)) seconds"
    print_status "Checking PostgreSQL logs:"
    docker logs "$POSTGRES_CONTAINER" --tail 20
    exit 1
fi

print_success "PostgreSQL is healthy"

# Step 5: Wait for Redis to be healthy
print_status "Waiting for Redis to be ready..."
REDIS_HEALTHY=false
RETRY_COUNT=0

# Find the Redis container name dynamically
REDIS_CONTAINER=$(docker ps --filter "name=fitnessmealplanner-redis" --format "{{.Names}}" | head -1)

if [ -z "$REDIS_CONTAINER" ]; then
    print_warning "Redis container not found, skipping Redis health check"
    REDIS_HEALTHY=true
else
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$REDIS_CONTAINER" 2>/dev/null || echo "not_found")

        if [ "$HEALTH_STATUS" = "healthy" ]; then
            REDIS_HEALTHY=true
            break
        fi

        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo -n "."
        sleep 2
    done
fi

echo ""

if [ "$REDIS_HEALTHY" = false ]; then
    print_warning "Redis health check did not pass, but continuing..."
else
    print_success "Redis is healthy"
fi

# Step 6: Run database migrations
print_status "Running database migrations..."
if npm run db:push > /dev/null 2>&1; then
    print_success "Database schema updated"
else
    print_warning "Database migration had warnings (this may be normal)"
fi

# Step 7: Seed test accounts
print_status "Seeding test accounts..."
if npm run seed:test 2>&1 | grep -q "Seeded Successfully\|Created/Updated"; then
    print_success "Test accounts are ready"
else
    print_warning "Test account seeding completed with warnings"
fi

# Step 8: Verify test accounts exist
print_status "Verifying test accounts..."
ADMIN_EXISTS=$(docker exec "$POSTGRES_CONTAINER" psql -U postgres -d fitmeal -t -c "SELECT email FROM users WHERE email='admin@fitmeal.pro';" 2>/dev/null | grep -c "admin@fitmeal.pro" || echo "0")

if [ "$ADMIN_EXISTS" = "1" ]; then
    print_success "Test account verified: admin@fitmeal.pro"
else
    print_error "Test account admin@fitmeal.pro not found!"
    print_warning "You may need to run: npm run seed:test-accounts manually"
fi

# Step 9: Display service status
echo ""
print_success "All services are ready!"
echo ""
echo "=========================================="
echo "  Service Status"
echo "=========================================="
docker ps --filter "name=fitnessmealplanner" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Step 10: Display connection information
echo "=========================================="
echo "  Connection Information"
echo "=========================================="
echo ""
echo "  Frontend/Backend: http://localhost:4000"
echo "  PostgreSQL:       localhost:5433"
echo "  Redis:            localhost:6379"
echo ""
echo "=========================================="
echo "  Test Credentials"
echo "=========================================="
echo ""
echo "  Admin:"
echo "    Email:    admin@fitmeal.pro"
echo "    Password: AdminPass123"
echo ""
echo "  Trainer:"
echo "    Email:    trainer.test@evofitmeals.com"
echo "    Password: TestTrainer123!"
echo ""
echo "  Customer:"
echo "    Email:    customer.test@evofitmeals.com"
echo "    Password: TestCustomer123!"
echo ""
echo "=========================================="
echo "  Quick Commands"
echo "=========================================="
echo ""
echo "  View logs:        npm run docker:dev:logs"
echo "  Stop services:    npm run docker:dev:stop"
echo "  Restart services: npm run docker:dev:restart"
echo ""
echo "=========================================="
echo ""

# Step 11: Ask if user wants to start dev server
read -p "Start the development server now? (Y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    print_status "Starting development server..."
    npm run dev
else
    print_status "Development environment is ready. Run 'npm run dev' when ready."
fi
