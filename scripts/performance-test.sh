#!/bin/bash

# FitnessMealPlanner Performance Testing Script
# Tests Docker optimization improvements and infrastructure performance

set -e

# Configuration
BASE_URL="http://localhost:4000"
PROD_URL="http://localhost"
METRICS_FILE="./performance-results.json"
LOG_FILE="./logs/performance-test-$(date +%Y%m%d-%H%M%S).log"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Test Docker build performance
test_docker_build_performance() {
    log "Testing Docker build performance..."
    
    local start_time=$(date +%s)
    
    # Build with cache
    log "Building with cache..."
    docker build -t fitmeal-test --target production . > /dev/null 2>&1
    
    local cached_time=$(($(date +%s) - start_time))
    success "Cached build completed in ${cached_time}s"
    
    # Build without cache
    log "Building without cache..."
    start_time=$(date +%s)
    docker build -t fitmeal-test-nocache --target production --no-cache . > /dev/null 2>&1
    
    local uncached_time=$(($(date +%s) - start_time))
    success "No-cache build completed in ${uncached_time}s"
    
    # Calculate image size
    local image_size=$(docker images fitmeal-test --format "table {{.Size}}" | tail -1)
    success "Production image size: $image_size"
    
    # Cleanup
    docker rmi fitmeal-test fitmeal-test-nocache > /dev/null 2>&1 || true
    
    echo "{\"cached_build_time\": $cached_time, \"uncached_build_time\": $uncached_time, \"image_size\": \"$image_size\"}" > build-performance.json
}

# Test application startup time
test_startup_performance() {
    log "Testing application startup performance..."
    
    # Start development environment
    docker-compose --profile dev up -d > /dev/null 2>&1
    
    local start_time=$(date +%s)
    local max_wait=120
    local elapsed=0
    
    while [ $elapsed -lt $max_wait ]; do
        if curl -f "$BASE_URL/health" > /dev/null 2>&1; then
            success "Application started in ${elapsed}s"
            echo "{\"startup_time\": $elapsed}" > startup-performance.json
            return 0
        fi
        sleep 5
        elapsed=$((elapsed + 5))
    done
    
    error "Application failed to start within ${max_wait}s"
    return 1
}

# Test API response times
test_api_performance() {
    log "Testing API response times..."
    
    local endpoints=(
        "/health"
        "/api/health"
        "/api/recipes"
        "/api/meal-plans"
        "/api/profile"
    )
    
    echo "{" > api-performance.json
    local first=true
    
    for endpoint in "${endpoints[@]}"; do
        log "Testing endpoint: $endpoint"
        
        # Use curl to measure response time
        local response_time=$(curl -o /dev/null -s -w "%{time_total}" "$BASE_URL$endpoint" 2>/dev/null || echo "0")
        
        if [ "$response_time" != "0" ]; then
            success "Endpoint $endpoint: ${response_time}s"
            if [ "$first" = true ]; then
                first=false
            else
                echo "," >> api-performance.json
            fi
            echo "  \"$endpoint\": $response_time" >> api-performance.json
        else
            warning "Endpoint $endpoint: Failed to respond"
        fi
    done
    
    echo "}" >> api-performance.json
}

# Test memory usage
test_memory_usage() {
    log "Testing memory usage..."
    
    # Get container memory stats
    local app_memory=$(docker stats fitmeal-app-dev --no-stream --format "{{.MemUsage}}" | cut -d'/' -f1 | sed 's/MiB//g' | tr -d ' ')
    local db_memory=$(docker stats fitmeal-postgres --no-stream --format "{{.MemUsage}}" | cut -d'/' -f1 | sed 's/MiB//g' | tr -d ' ')
    
    success "App memory usage: ${app_memory}MB"
    success "Database memory usage: ${db_memory}MB"
    
    echo "{\"app_memory_mb\": \"$app_memory\", \"db_memory_mb\": \"$db_memory\"}" > memory-usage.json
}

# Test concurrent load
test_concurrent_load() {
    log "Testing concurrent load handling..."
    
    # Install apache bench if not available
    if ! command -v ab &> /dev/null; then
        warning "Apache Bench (ab) not found. Skipping concurrent load test."
        return 0
    fi
    
    # Test with 10 concurrent users, 100 requests
    local ab_result=$(ab -n 100 -c 10 "$BASE_URL/health" 2>/dev/null | grep "Requests per second" | awk '{print $4}')
    
    if [ -n "$ab_result" ]; then
        success "Requests per second: $ab_result"
        echo "{\"requests_per_second\": $ab_result}" > load-test.json
    else
        warning "Load test failed"
    fi
}

# Compile performance report
compile_performance_report() {
    log "Compiling performance report..."
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    echo "{" > "$METRICS_FILE"
    echo "  \"timestamp\": \"$timestamp\"," >> "$METRICS_FILE"
    echo "  \"test_environment\": \"development\"," >> "$METRICS_FILE"
    
    # Merge all performance data
    if [ -f "build-performance.json" ]; then
        echo "  \"build_performance\": $(cat build-performance.json)," >> "$METRICS_FILE"
    fi
    
    if [ -f "startup-performance.json" ]; then
        echo "  \"startup_performance\": $(cat startup-performance.json)," >> "$METRICS_FILE"
    fi
    
    if [ -f "api-performance.json" ]; then
        echo "  \"api_performance\": $(cat api-performance.json)," >> "$METRICS_FILE"
    fi
    
    if [ -f "memory-usage.json" ]; then
        echo "  \"memory_usage\": $(cat memory-usage.json)," >> "$METRICS_FILE"
    fi
    
    if [ -f "load-test.json" ]; then
        echo "  \"load_test\": $(cat load-test.json)" >> "$METRICS_FILE"
    fi
    
    echo "}" >> "$METRICS_FILE"
    
    # Clean up temporary files
    rm -f build-performance.json startup-performance.json api-performance.json memory-usage.json load-test.json
    
    success "Performance report saved to $METRICS_FILE"
}

# Health check validation
validate_health_endpoints() {
    log "Validating health check endpoints..."
    
    # Test health endpoint
    if curl -f "$BASE_URL/health" > /dev/null 2>&1; then
        success "Health endpoint responding"
    else
        error "Health endpoint not responding"
        return 1
    fi
    
    # Test metrics endpoint
    if curl -f "$BASE_URL/api/metrics" > /dev/null 2>&1; then
        success "Metrics endpoint responding"
    else
        warning "Metrics endpoint not responding"
    fi
}

# Main test function
main() {
    log "Starting FitnessMealPlanner performance testing"
    
    mkdir -p logs
    
    # Ensure development environment is running
    log "Ensuring development environment is running..."
    docker-compose --profile dev up -d
    
    # Wait for services to be ready
    sleep 30
    
    validate_health_endpoints
    test_docker_build_performance
    test_startup_performance
    test_api_performance
    test_memory_usage
    test_concurrent_load
    compile_performance_report
    
    success "Performance testing completed!"
    success "Results saved to: $METRICS_FILE"
    success "Logs saved to: $LOG_FILE"
    
    # Display summary
    log "Performance Summary:"
    if [ -f "$METRICS_FILE" ]; then
        cat "$METRICS_FILE"
    fi
}

# Script options
case "${1:-test}" in
    "test")
        main
        ;;
    "build")
        test_docker_build_performance
        ;;
    "startup")
        test_startup_performance
        ;;
    "api")
        test_api_performance
        ;;
    "memory")
        test_memory_usage
        ;;
    "load")
        test_concurrent_load
        ;;
    "health")
        validate_health_endpoints
        ;;
    *)
        echo "Usage: $0 {test|build|startup|api|memory|load|health}"
        echo "  test    - Run all performance tests (default)"
        echo "  build   - Test Docker build performance"
        echo "  startup - Test application startup time"
        echo "  api     - Test API response times"
        echo "  memory  - Test memory usage"
        echo "  load    - Test concurrent load handling"
        echo "  health  - Validate health endpoints"
        exit 1
        ;;
esac