#!/bin/bash
# DigitalOcean Redis Deployment Script for FitnessMealPlanner
# Production-ready Redis deployment with high availability

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables
PROJECT_NAME="fitnessmealplanner"
REGISTRY="registry.digitalocean.com/bci"
IMAGE_TAG="redis-prod"
REDIS_VERSION="7-alpine"
APP_ID="600abc04-b784-426c-8799-0c09f8b9a958"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if doctl is installed
    if ! command -v doctl &> /dev/null; then
        error "doctl CLI is not installed. Please install it first."
        echo "Visit: https://docs.digitalocean.com/reference/doctl/how-to/install/"
        exit 1
    fi
    
    # Check if docker is running
    if ! docker info &> /dev/null; then
        error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if logged into DigitalOcean
    if ! doctl auth list &> /dev/null; then
        error "Not authenticated with DigitalOcean. Please run: doctl auth init"
        exit 1
    fi
    
    # Check environment variables
    if [[ -z "${REDIS_PASSWORD:-}" ]]; then
        error "REDIS_PASSWORD environment variable is not set"
        exit 1
    fi
    
    if [[ -z "${DIGITALOCEAN_TOKEN:-}" ]]; then
        warning "DIGITALOCEAN_TOKEN not set. Using doctl authentication."
    fi
    
    success "Prerequisites check completed"
}

# Deploy Redis infrastructure on DigitalOcean
deploy_redis_infrastructure() {
    log "Deploying Redis infrastructure..."
    
    # Create or update Redis database cluster
    create_redis_cluster() {
        log "Creating Redis cluster..."
        
        # Check if Redis cluster exists
        if doctl databases list --format Name | grep -q "${PROJECT_NAME}-redis"; then
            warning "Redis cluster ${PROJECT_NAME}-redis already exists"
            REDIS_CLUSTER_ID=$(doctl databases list --format ID,Name --no-header | grep "${PROJECT_NAME}-redis" | cut -d' ' -f1)
        else
            # Create Redis cluster
            log "Creating new Redis cluster..."
            REDIS_CLUSTER_ID=$(doctl databases create "${PROJECT_NAME}-redis" \
                --engine redis \
                --version 7 \
                --size db-s-1vcpu-1gb \
                --region tor1 \
                --num-nodes 1 \
                --format ID \
                --no-header)
        fi
        
        log "Redis cluster ID: ${REDIS_CLUSTER_ID}"
        
        # Wait for cluster to be ready
        log "Waiting for Redis cluster to be ready..."
        while true; do
            STATUS=$(doctl databases get "${REDIS_CLUSTER_ID}" --format Status --no-header)
            if [[ "${STATUS}" == "online" ]]; then
                success "Redis cluster is online"
                break
            fi
            log "Cluster status: ${STATUS}. Waiting..."
            sleep 30
        done
        
        # Get connection details
        REDIS_CONNECTION=$(doctl databases connection "${REDIS_CLUSTER_ID}" --format URI --no-header)
        log "Redis connection URI: ${REDIS_CONNECTION}"
        
        return 0
    }
    
    # Execute Redis cluster creation
    create_redis_cluster
    
    success "Redis infrastructure deployed"
}

# Build Redis-enabled application image
build_redis_application() {
    log "Building Redis-enabled application image..."
    
    # Ensure we're in the project root
    if [[ ! -f "package.json" ]]; then
        error "package.json not found. Are you in the project root directory?"
        exit 1
    fi
    
    # Build production image with Redis support
    log "Building Docker image..."
    docker build \
        --target prod \
        --build-arg REDIS_ENABLED=true \
        -t "${PROJECT_NAME}:${IMAGE_TAG}" .
    
    # Tag for DigitalOcean registry
    docker tag "${PROJECT_NAME}:${IMAGE_TAG}" \
        "${REGISTRY}/${PROJECT_NAME}:${IMAGE_TAG}"
    
    success "Application image built successfully"
}

# Deploy to DigitalOcean Container Registry
deploy_to_registry() {
    log "Deploying to DigitalOcean Container Registry..."
    
    # Login to registry
    log "Logging into DigitalOcean Container Registry..."
    doctl registry login
    
    # Push image
    log "Pushing image to registry..."
    docker push "${REGISTRY}/${PROJECT_NAME}:${IMAGE_TAG}"
    
    success "Image pushed to registry"
}

# Update application configuration
update_app_configuration() {
    log "Updating application configuration..."
    
    # Create app spec with Redis configuration
    cat > /tmp/redis-app-spec.yaml << EOF
name: ${PROJECT_NAME}-redis-prod
services:
- name: web
  source_dir: /
  github:
    branch: main
    deploy_on_push: true
    repo: drmweyers/FitnessMealPlanner
  instance_count: 1
  instance_size_slug: basic-xxs
  dockerfile_path: Dockerfile
  build_command: |
    docker build --target prod -t app .
  run_command: npm start
  environment_slug: node-js
  envs:
  - key: NODE_ENV
    value: production
  - key: REDIS_URL
    value: \${redis.DATABASE_URL}
  - key: REDIS_SESSION_DB
    value: \${redis.DATABASE_URL}/1
  - key: REDIS_CACHE_DB
    value: \${redis.DATABASE_URL}/2
  - key: SESSION_STORE
    value: redis
  - key: CACHE_ENABLED
    value: true
  - key: REDIS_SENTINEL_ENABLED
    value: false
  - key: PORT
    value: 5001
databases:
- name: postgres
  engine: PG
  version: "16"
  size: db-s-1vcpu-1gb
  num_nodes: 1
- name: redis
  engine: REDIS
  version: "7"
  size: db-s-1vcpu-1gb
  num_nodes: 1
  eviction_policy: allkeys_lru
EOF
    
    # Apply the updated configuration
    if doctl apps list --format Name | grep -q "${PROJECT_NAME}-redis-prod"; then
        log "Updating existing app..."
        APP_ID=$(doctl apps list --format ID,Name --no-header | grep "${PROJECT_NAME}-redis-prod" | cut -d' ' -f1)
        doctl apps update "${APP_ID}" --spec /tmp/redis-app-spec.yaml
    else
        log "Creating new app with Redis..."
        doctl apps create --spec /tmp/redis-app-spec.yaml
    fi
    
    # Clean up temp file
    rm /tmp/redis-app-spec.yaml
    
    success "Application configuration updated"
}

# Monitor deployment
monitor_deployment() {
    log "Monitoring deployment..."
    
    # Get the latest deployment
    DEPLOYMENT_ID=$(doctl apps get "${APP_ID}" --format "Deployments" --no-header | head -n1)
    
    log "Monitoring deployment: ${DEPLOYMENT_ID}"
    
    # Monitor deployment progress
    while true; do
        DEPLOYMENT_STATUS=$(doctl apps get-deployment "${APP_ID}" "${DEPLOYMENT_ID}" --format Phase --no-header)
        
        case "${DEPLOYMENT_STATUS}" in
            "PENDING_BUILD"|"BUILDING"|"PENDING_DEPLOY"|"DEPLOYING")
                log "Deployment status: ${DEPLOYMENT_STATUS}"
                sleep 30
                ;;
            "ACTIVE")
                success "Deployment completed successfully"
                break
                ;;
            "ERROR"|"CANCELED"|"SUPERSEDED")
                error "Deployment failed with status: ${DEPLOYMENT_STATUS}"
                exit 1
                ;;
            *)
                warning "Unknown deployment status: ${DEPLOYMENT_STATUS}"
                sleep 30
                ;;
        esac
    done
}

# Verify Redis deployment
verify_deployment() {
    log "Verifying Redis deployment..."
    
    # Get app URL
    APP_URL=$(doctl apps get "${APP_ID}" --format LiveURL --no-header)
    
    if [[ -z "${APP_URL}" ]]; then
        error "Could not get app URL"
        exit 1
    fi
    
    log "App URL: ${APP_URL}"
    
    # Test application health
    log "Testing application health..."
    if curl -f -s "${APP_URL}/api/health" > /dev/null; then
        success "Application health check passed"
    else
        error "Application health check failed"
        exit 1
    fi
    
    # Test Redis connectivity (if endpoint exists)
    log "Testing Redis connectivity..."
    if curl -f -s "${APP_URL}/api/redis/ping" > /dev/null; then
        success "Redis connectivity test passed"
    else
        warning "Redis connectivity test endpoint not available or failed"
    fi
    
    success "Deployment verification completed"
}

# Rollback function
rollback_deployment() {
    error "Rolling back deployment due to failure..."
    
    # Get previous deployment
    PREVIOUS_DEPLOYMENT=$(doctl apps list-deployments "${APP_ID}" --format ID --no-header | sed -n '2p')
    
    if [[ -n "${PREVIOUS_DEPLOYMENT}" ]]; then
        log "Rolling back to deployment: ${PREVIOUS_DEPLOYMENT}"
        # Note: DigitalOcean doesn't support direct rollback via CLI
        # This would require re-deploying the previous image
        warning "Manual rollback required through DigitalOcean dashboard"
    else
        error "No previous deployment found for rollback"
    fi
}

# Cleanup function
cleanup() {
    log "Performing cleanup..."
    rm -f /tmp/redis-app-spec.yaml
    log "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting Redis deployment for FitnessMealPlanner"
    
    # Set up trap for cleanup
    trap cleanup EXIT
    trap rollback_deployment ERR
    
    # Execute deployment steps
    check_prerequisites
    deploy_redis_infrastructure
    build_redis_application
    deploy_to_registry
    update_app_configuration
    monitor_deployment
    verify_deployment
    
    success "Redis deployment completed successfully!"
    success "Application URL: https://evofitmeals.com"
    
    log "Next steps:"
    echo "1. Monitor application performance through DigitalOcean dashboard"
    echo "2. Set up Redis monitoring alerts"
    echo "3. Configure backup schedules"
    echo "4. Review Redis metrics and adjust configuration if needed"
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi