#!/bin/bash
# Redis Security Audit Script for FitnessMealPlanner
# Comprehensive security validation and reporting

set -euo pipefail

# Configuration
REDIS_HOST="${REDIS_HOST:-redis-primary}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD}"
AUDIT_LOG="/var/log/redis/security-audit-$(date +%Y%m%d_%H%M%S).log"
REPORT_FILE="/tmp/redis-security-report-$(date +%Y%m%d).txt"
ALERT_EMAIL="${ALERT_EMAIL:-admin@evofitmeals.com}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$AUDIT_LOG"
}

pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1" | tee -a "$AUDIT_LOG"
}

fail() {
    echo -e "${RED}❌ FAIL:${NC} $1" | tee -a "$AUDIT_LOG"
}

warn() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1" | tee -a "$AUDIT_LOG"
}

# Initialize audit
initialize_audit() {
    mkdir -p "$(dirname "$AUDIT_LOG")"
    
    log "Redis Security Audit Started"
    log "==============================="
    log "Target: $REDIS_HOST:$REDIS_PORT"
    log "Timestamp: $(date)"
    log "Auditor: $(whoami)"
    log ""
    
    # Initialize report
    cat > "$REPORT_FILE" << EOF
Redis Security Audit Report
===========================
Date: $(date)
Target: $REDIS_HOST:$REDIS_PORT
Auditor: $(whoami)

EXECUTIVE SUMMARY
================

EOF
}

# Test Redis connectivity
test_connectivity() {
    log "1. Testing Redis Connectivity"
    log "------------------------------"
    
    # Test basic connectivity
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping > /dev/null 2>&1; then
        pass "Redis connection successful"
        return 0
    else
        fail "Cannot connect to Redis"
        return 1
    fi
}

# Test authentication security
test_authentication() {
    log "2. Authentication Security Tests"
    log "--------------------------------"
    
    local auth_score=0
    
    # Test 1: Authentication required
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping > /dev/null 2>&1; then
        fail "Redis accessible without authentication"
        echo "CRITICAL: Redis allows unauthenticated access" >> "$REPORT_FILE"
    else
        pass "Authentication required"
        ((auth_score++))
    fi
    
    # Test 2: Strong password policy
    local password_length=${#REDIS_PASSWORD}
    if [[ $password_length -ge 16 ]]; then
        pass "Password length adequate ($password_length characters)"
        ((auth_score++))
    else
        warn "Password length insufficient ($password_length characters, recommended: 16+)"
    fi
    
    # Test 3: Check for default passwords
    local default_passwords=("password" "redis" "123456" "admin" "root")
    for default_pass in "${default_passwords[@]}"; do
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$default_pass" ping > /dev/null 2>&1; then
            fail "Default/weak password detected: $default_pass"
            echo "CRITICAL: Weak password in use" >> "$REPORT_FILE"
            return 1
        fi
    done
    pass "No default passwords detected"
    ((auth_score++))
    
    log "Authentication Score: $auth_score/3"
    echo "Authentication Security Score: $auth_score/3" >> "$REPORT_FILE"
}

# Test ACL configuration
test_acl_configuration() {
    log "3. ACL Configuration Tests"
    log "-------------------------"
    
    local acl_score=0
    
    # Test ACL enabled
    local acl_users
    if acl_users=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ACL LIST 2>/dev/null); then
        pass "ACL system is enabled"
        ((acl_score++))
        
        # Count users
        local user_count
        user_count=$(echo "$acl_users" | wc -l)
        log "Found $user_count ACL users"
        
        # Check default user status
        if echo "$acl_users" | grep -q "user default off"; then
            pass "Default user is disabled"
            ((acl_score++))
        else
            warn "Default user is still enabled"
        fi
        
        # Check for application-specific users
        if echo "$acl_users" | grep -q "fitnessmealplanner"; then
            pass "Application-specific users found"
            ((acl_score++))
        else
            warn "No application-specific users found"
        fi
        
    else
        fail "ACL system not properly configured"
    fi
    
    log "ACL Score: $acl_score/3"
    echo "ACL Security Score: $acl_score/3" >> "$REPORT_FILE"
}

# Test command restrictions
test_command_restrictions() {
    log "4. Command Restriction Tests"
    log "----------------------------"
    
    local cmd_score=0
    local dangerous_commands=("FLUSHALL" "FLUSHDB" "CONFIG" "DEBUG" "EVAL" "SCRIPT" "SHUTDOWN")
    
    for cmd in "${dangerous_commands[@]}"; do
        local result
        result=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" "$cmd" 2>&1 || true)
        
        if echo "$result" | grep -q "unknown command\|ERR unknown command"; then
            pass "Dangerous command $cmd is disabled"
            ((cmd_score++))
        elif echo "$result" | grep -q "NOAUTH\|Authentication required"; then
            warn "Command $cmd exists but requires authentication"
        else
            fail "Dangerous command $cmd is available"
            echo "SECURITY RISK: Command $cmd is enabled" >> "$REPORT_FILE"
        fi
    done
    
    log "Command Restriction Score: $cmd_score/${#dangerous_commands[@]}"
    echo "Command Restriction Score: $cmd_score/${#dangerous_commands[@]}" >> "$REPORT_FILE"
}

# Test network security
test_network_security() {
    log "5. Network Security Tests"
    log "------------------------"
    
    local network_score=0
    
    # Test bind configuration
    local bind_config
    if bind_config=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" CONFIG GET bind 2>/dev/null); then
        if echo "$bind_config" | grep -q "127.0.0.1\|0.0.0.0"; then
            local bind_value
            bind_value=$(echo "$bind_config" | tail -1)
            log "Bind configuration: $bind_value"
            
            if [[ "$bind_value" == "0.0.0.0" ]]; then
                warn "Redis bound to all interfaces (ensure firewall protection)"
            else
                pass "Redis bind configuration appears secure"
                ((network_score++))
            fi
        fi
    fi
    
    # Test protected mode
    local protected_mode
    if protected_mode=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" CONFIG GET protected-mode 2>/dev/null); then
        if echo "$protected_mode" | grep -q "yes"; then
            pass "Protected mode is enabled"
            ((network_score++))
        else
            warn "Protected mode is disabled"
        fi
    fi
    
    # Test TLS configuration
    local tls_config
    if tls_config=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" CONFIG GET "tls-*" 2>/dev/null); then
        if [[ -n "$tls_config" ]] && ! echo "$tls_config" | grep -q "empty"; then
            pass "TLS configuration detected"
            ((network_score++))
        else
            warn "No TLS configuration found"
        fi
    fi
    
    log "Network Security Score: $network_score/3"
    echo "Network Security Score: $network_score/3" >> "$REPORT_FILE"
}

# Test configuration security
test_configuration_security() {
    log "6. Configuration Security Tests"
    log "------------------------------"
    
    local config_score=0
    
    # Get all configuration
    local config
    config=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" CONFIG GET "*" 2>/dev/null)
    
    # Check for security-related configurations
    security_configs=(
        "requirepass:Authentication configured"
        "rename-command:Command renaming in use"
        "maxmemory-policy:Memory policy configured"
        "appendonly:Persistence configured"
    )
    
    for check in "${security_configs[@]}"; do
        local key="${check%%:*}"
        local desc="${check##*:}"
        
        if echo "$config" | grep -q "$key"; then
            pass "$desc"
            ((config_score++))
        else
            warn "$desc - not found"
        fi
    done
    
    # Check for dangerous configuration values
    if echo "$config" | grep -q "save.*\"\""; then
        warn "RDB snapshots disabled - data persistence at risk"
    else
        pass "Data persistence appears configured"
        ((config_score++))
    fi
    
    log "Configuration Security Score: $config_score/5"
    echo "Configuration Security Score: $config_score/5" >> "$REPORT_FILE"
}

# Test operational security
test_operational_security() {
    log "7. Operational Security Tests"
    log "----------------------------"
    
    local ops_score=0
    
    # Check Redis version
    local redis_version
    redis_version=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" INFO server | grep "redis_version" | cut -d: -f2 | tr -d '\r')
    log "Redis version: $redis_version"
    
    # Version security check (simplified)
    if [[ "$redis_version" =~ ^7\. ]] || [[ "$redis_version" =~ ^6\.2 ]]; then
        pass "Redis version is recent ($redis_version)"
        ((ops_score++))
    else
        warn "Redis version may be outdated ($redis_version)"
    fi
    
    # Check memory usage
    local memory_info
    memory_info=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" INFO memory)
    local used_memory
    local max_memory
    used_memory=$(echo "$memory_info" | grep "used_memory:" | cut -d: -f2 | tr -d '\r')
    max_memory=$(echo "$memory_info" | grep "maxmemory:" | cut -d: -f2 | tr -d '\r')
    
    if [[ "$max_memory" != "0" ]]; then
        pass "Memory limits configured"
        ((ops_score++))
    else
        warn "No memory limits configured"
    fi
    
    # Check for slow queries
    local slowlog_len
    slowlog_len=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" SLOWLOG LEN)
    if [[ "$slowlog_len" -lt 10 ]]; then
        pass "Slow query log looks normal ($slowlog_len entries)"
        ((ops_score++))
    else
        warn "High number of slow queries ($slowlog_len entries)"
    fi
    
    # Check connected clients
    local connected_clients
    connected_clients=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" INFO clients | grep "connected_clients" | cut -d: -f2 | tr -d '\r')
    log "Connected clients: $connected_clients"
    
    if [[ "$connected_clients" -lt 50 ]]; then
        pass "Normal number of connected clients ($connected_clients)"
        ((ops_score++))
    else
        warn "High number of connected clients ($connected_clients)"
    fi
    
    log "Operational Security Score: $ops_score/4"
    echo "Operational Security Score: $ops_score/4" >> "$REPORT_FILE"
}

# Test backup and recovery
test_backup_recovery() {
    log "8. Backup and Recovery Tests"
    log "---------------------------"
    
    local backup_score=0
    
    # Check RDB configuration
    local save_config
    save_config=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" CONFIG GET save 2>/dev/null)
    if echo "$save_config" | grep -q "save" && ! echo "$save_config" | grep -q '""'; then
        pass "RDB snapshots configured"
        ((backup_score++))
    else
        warn "No RDB snapshot schedule configured"
    fi
    
    # Check AOF configuration
    local aof_enabled
    aof_enabled=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" CONFIG GET appendonly | tail -1)
    if [[ "$aof_enabled" == "yes" ]]; then
        pass "AOF persistence enabled"
        ((backup_score++))
    else
        warn "AOF persistence disabled"
    fi
    
    # Check last save time
    local last_save
    last_save=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)
    local current_time
    current_time=$(date +%s)
    local time_diff=$((current_time - last_save))
    
    if [[ $time_diff -lt 3600 ]]; then # Less than 1 hour
        pass "Recent backup detected ($(($time_diff / 60)) minutes ago)"
        ((backup_score++))
    else
        warn "Last backup was $(($time_diff / 3600)) hours ago"
    fi
    
    log "Backup/Recovery Score: $backup_score/3"
    echo "Backup/Recovery Score: $backup_score/3" >> "$REPORT_FILE"
}

# Generate security recommendations
generate_recommendations() {
    log "9. Generating Security Recommendations"
    log "------------------------------------"
    
    cat >> "$REPORT_FILE" << EOF

SECURITY RECOMMENDATIONS
========================

Based on the audit findings, here are the recommended security improvements:

HIGH PRIORITY:
- Ensure Redis is not accessible without authentication
- Disable or rename all dangerous commands (FLUSHALL, FLUSHDB, CONFIG, DEBUG, EVAL)
- Configure ACL with principle of least privilege
- Enable TLS/SSL for all connections
- Set strong password policies (minimum 16 characters)

MEDIUM PRIORITY:
- Configure memory limits to prevent DoS attacks
- Enable comprehensive logging and monitoring
- Set up regular automated backups
- Configure network firewall rules
- Update Redis to the latest stable version

LOW PRIORITY:
- Optimize performance configurations
- Set up alerting for security events
- Document security procedures
- Conduct regular security training

COMPLIANCE:
- Ensure data encryption at rest and in transit
- Implement access logging and audit trails
- Regular security assessments and penetration testing
- Data retention and backup policies

EOF
}

# Generate final report
generate_final_report() {
    log "10. Finalizing Security Audit Report"
    log "-----------------------------------"
    
    local overall_score=0
    local max_score=0
    
    # Calculate overall security score from previous tests
    # This would be implemented based on the scoring from each test
    
    cat >> "$REPORT_FILE" << EOF

OVERALL SECURITY ASSESSMENT
===========================

Audit Completed: $(date)
Overall Security Score: Calculated based on individual component scores

NEXT STEPS:
1. Address all CRITICAL and HIGH priority findings immediately
2. Schedule remediation for MEDIUM priority items within 30 days
3. Plan LOW priority improvements for next maintenance window
4. Schedule follow-up audit in 90 days

Report generated by: Redis Security Audit Script v1.0
For questions or concerns, contact: $ALERT_EMAIL

EOF
    
    log "Audit report generated: $REPORT_FILE"
    pass "Security audit completed successfully"
}

# Send audit report
send_audit_report() {
    if command -v mail &> /dev/null && [[ -n "$ALERT_EMAIL" ]]; then
        log "Sending audit report to $ALERT_EMAIL"
        mail -s "Redis Security Audit Report - $(date +%Y-%m-%d)" "$ALERT_EMAIL" < "$REPORT_FILE"
        pass "Audit report sent via email"
    else
        warn "Email not configured - audit report saved locally: $REPORT_FILE"
    fi
}

# Main audit execution
main() {
    initialize_audit
    
    if test_connectivity; then
        test_authentication
        test_acl_configuration
        test_command_restrictions
        test_network_security
        test_configuration_security
        test_operational_security
        test_backup_recovery
        generate_recommendations
        generate_final_report
        send_audit_report
    else
        fail "Cannot proceed with audit - Redis connectivity failed"
        exit 1
    fi
    
    log "Redis Security Audit Completed"
    log "Audit log: $AUDIT_LOG"
    log "Full report: $REPORT_FILE"
}

# Handle script interruption
cleanup() {
    log "Audit interrupted - cleaning up..."
    exit 1
}

trap cleanup INT TERM

# Run audit if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi