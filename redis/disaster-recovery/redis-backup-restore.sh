#!/bin/bash
# Redis Disaster Recovery Script for FitnessMealPlanner
# Automated backup and restore procedures for production Redis

set -euo pipefail

# Configuration
REDIS_HOST="${REDIS_HOST:-redis-primary}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
S3_BUCKET="${S3_BUCKET_NAME:-healthtech}"
S3_PREFIX="redis-backups/fitnessmealplanner"

# DigitalOcean Spaces configuration
DO_SPACES_ENDPOINT="${AWS_ENDPOINT:-https://tor1.digitaloceanspaces.com}"
DO_SPACES_REGION="tor1"

# Logging
LOG_FILE="/var/log/redis/backup.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo "[ERROR] $1" | tee -a "$LOG_FILE" >&2
}

success() {
    echo "[SUCCESS] $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if redis-cli is available
    if ! command -v redis-cli &> /dev/null; then
        error "redis-cli is not installed"
        exit 1
    fi
    
    # Check if AWS CLI is available (for DigitalOcean Spaces)
    if ! command -v aws &> /dev/null; then
        error "aws-cli is not installed"
        exit 1
    fi
    
    # Test Redis connection
    if ! redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping > /dev/null; then
        error "Cannot connect to Redis at $REDIS_HOST:$REDIS_PORT"
        exit 1
    fi
    
    success "Prerequisites check completed"
}

# Create Redis backup
create_backup() {
    local backup_type="$1"
    local backup_date=$(date +'%Y%m%d_%H%M%S')
    local backup_dir="/tmp/redis-backup-$backup_date"
    
    log "Creating $backup_type backup..."
    mkdir -p "$backup_dir"
    
    case "$backup_type" in
        "snapshot")
            create_snapshot_backup "$backup_dir" "$backup_date"
            ;;
        "full")
            create_full_backup "$backup_dir" "$backup_date"
            ;;
        *)
            error "Unknown backup type: $backup_type"
            exit 1
            ;;
    esac
    
    # Upload to DigitalOcean Spaces
    upload_to_spaces "$backup_dir" "$backup_date" "$backup_type"
    
    # Cleanup local files
    rm -rf "$backup_dir"
    
    success "$backup_type backup completed: $backup_date"
}

# Create snapshot backup (RDB)
create_snapshot_backup() {
    local backup_dir="$1"
    local backup_date="$2"
    
    log "Triggering Redis snapshot..."
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE
    
    # Wait for background save to complete
    while [ "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)" -eq "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)" ]; do
        log "Waiting for background save to complete..."
        sleep 5
    done
    
    # Copy RDB file
    docker cp "fitnessmealplanner-redis-primary:/data/redis-primary.rdb" "$backup_dir/redis-snapshot-$backup_date.rdb"
    
    # Create metadata
    create_backup_metadata "$backup_dir" "$backup_date" "snapshot"
}

# Create full backup (RDB + AOF)
create_full_backup() {
    local backup_dir="$1"
    local backup_date="$2"
    
    log "Creating full backup with RDB and AOF..."
    
    # Trigger snapshot
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE
    
    # Wait for background save to complete
    while [ "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)" -eq "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)" ]; do
        log "Waiting for background save to complete..."
        sleep 2
    done
    
    # Copy RDB file
    docker cp "fitnessmealplanner-redis-primary:/data/redis-primary.rdb" "$backup_dir/redis-snapshot-$backup_date.rdb"
    
    # Copy AOF file if it exists
    if docker exec "fitnessmealplanner-redis-primary" test -f "/data/redis-primary-appendonly.aof"; then
        docker cp "fitnessmealplanner-redis-primary:/data/redis-primary-appendonly.aof" "$backup_dir/redis-aof-$backup_date.aof"
    fi
    
    # Create configuration backup
    docker exec "fitnessmealplanner-redis-primary" redis-cli -a "$REDIS_PASSWORD" CONFIG GET '*' > "$backup_dir/redis-config-$backup_date.txt"
    
    # Create metadata
    create_backup_metadata "$backup_dir" "$backup_date" "full"
}

# Create backup metadata
create_backup_metadata() {
    local backup_dir="$1"
    local backup_date="$2"
    local backup_type="$3"
    
    local metadata_file="$backup_dir/metadata.json"
    
    cat > "$metadata_file" << EOF
{
    "backup_date": "$backup_date",
    "backup_type": "$backup_type",
    "redis_version": "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" INFO server | grep redis_version | cut -d: -f2 | tr -d '\r')",
    "total_keys": "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" DBSIZE)",
    "memory_usage": "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')",
    "last_save": "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)",
    "application": "fitnessmealplanner",
    "environment": "production"
}
EOF
}

# Upload backup to DigitalOcean Spaces
upload_to_spaces() {
    local backup_dir="$1"
    local backup_date="$2"
    local backup_type="$3"
    
    log "Uploading backup to DigitalOcean Spaces..."
    
    # Create compressed archive
    local archive_name="redis-backup-$backup_type-$backup_date.tar.gz"
    tar -czf "/tmp/$archive_name" -C "$backup_dir" .
    
    # Upload to Spaces
    aws s3 cp "/tmp/$archive_name" \
        "s3://$S3_BUCKET/$S3_PREFIX/$archive_name" \
        --endpoint-url "$DO_SPACES_ENDPOINT" \
        --region "$DO_SPACES_REGION"
    
    # Cleanup local archive
    rm -f "/tmp/$archive_name"
    
    success "Backup uploaded to s3://$S3_BUCKET/$S3_PREFIX/$archive_name"
}

# List available backups
list_backups() {
    log "Listing available backups..."
    
    aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" \
        --endpoint-url "$DO_SPACES_ENDPOINT" \
        --region "$DO_SPACES_REGION" \
        --recursive \
        --human-readable \
        --summarize
}

# Restore from backup
restore_backup() {
    local backup_file="$1"
    local restore_type="${2:-replace}"
    
    log "Restoring from backup: $backup_file"
    
    # Validate restore type
    if [[ "$restore_type" != "replace" && "$restore_type" != "merge" ]]; then
        error "Invalid restore type. Use 'replace' or 'merge'"
        exit 1
    fi
    
    # Download backup
    local temp_dir="/tmp/redis-restore-$(date +'%Y%m%d_%H%M%S')"
    mkdir -p "$temp_dir"
    
    aws s3 cp "s3://$S3_BUCKET/$S3_PREFIX/$backup_file" \
        "/tmp/$backup_file" \
        --endpoint-url "$DO_SPACES_ENDPOINT" \
        --region "$DO_SPACES_REGION"
    
    # Extract backup
    tar -xzf "/tmp/$backup_file" -C "$temp_dir"
    
    # Perform restore based on type
    if [[ "$restore_type" == "replace" ]]; then
        restore_replace "$temp_dir"
    else
        restore_merge "$temp_dir"
    fi
    
    # Cleanup
    rm -rf "$temp_dir" "/tmp/$backup_file"
    
    success "Restore completed from $backup_file"
}

# Replace restore (flushes current data)
restore_replace() {
    local backup_dir="$1"
    
    log "Performing replace restore (WARNING: Current data will be lost)"
    
    # Confirm with user
    read -p "This will DELETE all current Redis data. Are you sure? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        log "Restore cancelled by user"
        exit 1
    fi
    
    # Stop application to prevent writes
    log "Stopping application..."
    docker stop "fitnessmealplanner-prod" || true
    
    # Stop Redis to perform file-level restore
    log "Stopping Redis..."
    docker stop "fitnessmealplanner-redis-primary"
    
    # Replace data files
    if [[ -f "$backup_dir/redis-snapshot-*.rdb" ]]; then
        docker cp "$backup_dir"/redis-snapshot-*.rdb "fitnessmealplanner-redis-primary:/data/redis-primary.rdb"
    fi
    
    if [[ -f "$backup_dir/redis-aof-*.aof" ]]; then
        docker cp "$backup_dir"/redis-aof-*.aof "fitnessmealplanner-redis-primary:/data/redis-primary-appendonly.aof"
    fi
    
    # Start Redis
    log "Starting Redis..."
    docker start "fitnessmealplanner-redis-primary"
    
    # Wait for Redis to be ready
    wait_for_redis
    
    # Start application
    log "Starting application..."
    docker start "fitnessmealplanner-prod"
    
    success "Replace restore completed"
}

# Merge restore (preserves current data)
restore_merge() {
    local backup_dir="$1"
    
    log "Performing merge restore (current data will be preserved)"
    
    # Use redis-cli to restore data
    if [[ -f "$backup_dir/redis-snapshot-*.rdb" ]]; then
        log "Cannot perform merge restore with RDB file. Use 'replace' restore type instead."
        exit 1
    fi
    
    # For merge restore, we would need the original commands
    # This is complex and typically not recommended for production
    error "Merge restore is not implemented. Use 'replace' restore type."
    exit 1
}

# Wait for Redis to be ready
wait_for_redis() {
    log "Waiting for Redis to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping > /dev/null 2>&1; then
            success "Redis is ready"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts: Redis not ready yet..."
        sleep 5
        ((attempt++))
    done
    
    error "Redis did not become ready within expected time"
    exit 1
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups (older than $BACKUP_RETENTION_DAYS days)..."
    
    local cutoff_date=$(date -d "$BACKUP_RETENTION_DAYS days ago" +'%Y%m%d')
    
    # List and delete old backups
    aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" \
        --endpoint-url "$DO_SPACES_ENDPOINT" \
        --region "$DO_SPACES_REGION" \
        | while read -r line; do
            local file_date=$(echo "$line" | grep -o '[0-9]\{8\}' | head -1)
            local file_name=$(echo "$line" | awk '{print $4}')
            
            if [[ -n "$file_date" && "$file_date" -lt "$cutoff_date" ]]; then
                log "Deleting old backup: $file_name"
                aws s3 rm "s3://$S3_BUCKET/$S3_PREFIX/$file_name" \
                    --endpoint-url "$DO_SPACES_ENDPOINT" \
                    --region "$DO_SPACES_REGION"
            fi
        done
    
    success "Cleanup completed"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    log "Verifying backup integrity: $backup_file"
    
    # Download and extract backup
    local temp_dir="/tmp/redis-verify-$(date +'%Y%m%d_%H%M%S')"
    mkdir -p "$temp_dir"
    
    aws s3 cp "s3://$S3_BUCKET/$S3_PREFIX/$backup_file" \
        "/tmp/$backup_file" \
        --endpoint-url "$DO_SPACES_ENDPOINT" \
        --region "$DO_SPACES_REGION"
    
    if ! tar -tzf "/tmp/$backup_file" > /dev/null; then
        error "Backup archive is corrupted: $backup_file"
        exit 1
    fi
    
    tar -xzf "/tmp/$backup_file" -C "$temp_dir"
    
    # Verify metadata
    if [[ -f "$temp_dir/metadata.json" ]]; then
        log "Backup metadata found"
        cat "$temp_dir/metadata.json"
    else
        warning "No metadata found in backup"
    fi
    
    # Verify RDB file if present
    if [[ -f "$temp_dir"/redis-snapshot-*.rdb ]]; then
        if command -v redis-check-rdb &> /dev/null; then
            log "Verifying RDB file..."
            redis-check-rdb "$temp_dir"/redis-snapshot-*.rdb
        else
            warning "redis-check-rdb not available, skipping RDB verification"
        fi
    fi
    
    # Verify AOF file if present
    if [[ -f "$temp_dir"/redis-aof-*.aof ]]; then
        if command -v redis-check-aof &> /dev/null; then
            log "Verifying AOF file..."
            redis-check-aof "$temp_dir"/redis-aof-*.aof
        else
            warning "redis-check-aof not available, skipping AOF verification"
        fi
    fi
    
    # Cleanup
    rm -rf "$temp_dir" "/tmp/$backup_file"
    
    success "Backup verification completed: $backup_file"
}

# Main function
main() {
    local command="$1"
    shift
    
    case "$command" in
        "backup")
            check_prerequisites
            local backup_type="${1:-snapshot}"
            create_backup "$backup_type"
            ;;
        "restore")
            check_prerequisites
            local backup_file="$1"
            local restore_type="${2:-replace}"
            restore_backup "$backup_file" "$restore_type"
            ;;
        "list")
            list_backups
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "verify")
            local backup_file="$1"
            verify_backup "$backup_file"
            ;;
        "test")
            check_prerequisites
            success "All systems operational"
            ;;
        *)
            echo "Usage: $0 {backup|restore|list|cleanup|verify|test} [options]"
            echo ""
            echo "Commands:"
            echo "  backup [snapshot|full]          - Create backup"
            echo "  restore <backup-file> [replace|merge] - Restore from backup"
            echo "  list                            - List available backups"
            echo "  cleanup                         - Remove old backups"
            echo "  verify <backup-file>            - Verify backup integrity"
            echo "  test                            - Test system connectivity"
            exit 1
            ;;
    esac
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi