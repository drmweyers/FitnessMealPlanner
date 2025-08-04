#!/bin/bash

# FitnessMealPlanner Production Deployment Script
# Optimized deployment with health checks and rollback capability

set -e  # Exit on any error

# Configuration
APP_NAME="fitnessmealplanner"
DOCKER_COMPOSE_FILE="docker-compose.optimized.yml"
BACKUP_DIR="./backups"
LOG_FILE="./logs/deploy-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Starting pre-deployment checks..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running. Please start Docker and try again."
    fi
    
    # Check if required files exist
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        error "Docker compose file $DOCKER_COMPOSE_FILE not found."
    fi
    
    if [ ! -f ".env" ]; then
        error ".env file not found. Please create it with required environment variables."
    fi
    
    # Check if required environment variables are set
    if [ -z "$DATABASE_URL" ] && ! grep -q "DATABASE_URL" .env; then
        error "DATABASE_URL not found in environment variables or .env file."
    fi
    
    success "Pre-deployment checks completed successfully"
}

# Backup current state
backup_current_state() {
    log "Creating backup of current state..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if docker ps | grep -q "${APP_NAME}-postgres"; then
        log "Backing up database..."
        docker exec "${APP_NAME}-postgres" pg_dump -U postgres fitmeal > "$BACKUP_DIR/db-backup-$(date +%Y%m%d-%H%M%S).sql"
        success "Database backup created"
    fi
    
    # Backup uploaded files
    if [ -d "public/uploads" ]; then
        log "Backing up uploaded files..."
        tar -czf "$BACKUP_DIR/uploads-backup-$(date +%Y%m%d-%H%M%S).tar.gz" public/uploads/
        success "Uploads backup created"
    fi
}

# Build and deploy
deploy() {
    log "Starting deployment process..."
    
    # Pull latest changes (if in git repository)
    if [ -d ".git" ]; then
        log "Pulling latest changes from git..."
        git pull origin main || warning "Failed to pull from git, continuing with local changes"
    fi
    
    # Build new images
    log "Building Docker images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" --profile prod build --no-cache
    
    # Stop current services gracefully
    log "Stopping current services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" --profile prod down --timeout 30
    
    # Start new services
    log "Starting new services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" --profile prod up -d
    
    success "Services started successfully"
}

# Health check
health_check() {
    log "Performing health checks..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log "Health check attempt $attempt/$max_attempts..."
        
        if curl -f http://localhost/health > /dev/null 2>&1; then
            success "Application is healthy and responding"
            return 0
        fi
        
        sleep 10
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
}

# Rollback function
rollback() {
    log "Starting rollback process..."
    
    # Stop current services
    docker-compose -f "$DOCKER_COMPOSE_FILE" --profile prod down
    
    # Restore from backup
    local latest_db_backup=$(ls -t "$BACKUP_DIR"/db-backup-*.sql 2>/dev/null | head -1)
    if [ -n "$latest_db_backup" ]; then
        log "Restoring database from $latest_db_backup..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" --profile prod up -d postgres
        sleep 10
        docker exec -i "${APP_NAME}-postgres" psql -U postgres -d fitmeal < "$latest_db_backup"
    fi
    
    warning "Rollback completed. Please investigate the deployment issue."
}

# Main deployment function
main() {
    log "Starting FitnessMealPlanner production deployment"
    
    # Create logs directory
    mkdir -p logs
    
    # Set trap for rollback on failure
    trap 'error "Deployment failed. Starting rollback..."; rollback' ERR
    
    pre_deployment_checks
    backup_current_state
    deploy
    health_check
    
    success "Deployment completed successfully!"
    log "Application is available at: http://localhost"
    log "Admin panel: http://localhost/admin"
    log "Monitoring: http://localhost:3000 (Grafana)"
    log "Metrics: http://localhost:9090 (Prometheus)"
}

# Script options
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "health")
        health_check
        ;;
    "logs")
        docker-compose -f "$DOCKER_COMPOSE_FILE" --profile prod logs -f
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health|logs}"
        echo "  deploy  - Deploy the application (default)"
        echo "  rollback - Rollback to previous version"
        echo "  health  - Check application health"
        echo "  logs    - View application logs"
        exit 1
        ;;
esac