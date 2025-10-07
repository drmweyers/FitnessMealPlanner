# Redis Security Hardening Guide for FitnessMealPlanner

## 🔒 Security Overview

This guide provides comprehensive security hardening procedures for Redis deployment in the FitnessMealPlanner production environment on DigitalOcean.

## 🛡️ Network Security

### 1. VPC Isolation

```bash
# Redis should only be accessible within the VPC
# Use DigitalOcean VPC with private networking
VPC_RANGE="10.10.0.0/16"
REDIS_SUBNET="10.10.1.0/24"
```

### 2. Firewall Configuration

```yaml
# Firewall Rules (DigitalOcean)
inbound_rules:
  - protocol: tcp
    port_range: "6379"
    sources: 
      - "app-servers"  # Only application servers
  - protocol: tcp
    port_range: "26379" 
    sources:
      - "app-servers"  # Redis Sentinel access
  - protocol: tcp
    port_range: "9121"  # Redis exporter
    sources:
      - "monitoring-servers"

outbound_rules:
  - protocol: tcp
    port_range: "1-65535"
    destinations: ["0.0.0.0/0"]
```

### 3. TLS/SSL Configuration

```bash
# Generate TLS certificates for Redis
openssl req -x509 -nodes -newkey rsa:4096 \
    -keyout /etc/redis/tls/redis-server-key.pem \
    -out /etc/redis/tls/redis-server-cert.pem \
    -subj "/CN=redis.fitnessmealplanner.internal" \
    -days 3650

# Set proper permissions
chmod 600 /etc/redis/tls/redis-server-key.pem
chmod 644 /etc/redis/tls/redis-server-cert.pem
chown redis:redis /etc/redis/tls/*
```

### 4. Redis TLS Configuration

```conf
# redis.conf - TLS settings
port 0                    # Disable non-TLS port
tls-port 6379            # Enable TLS port
tls-cert-file /etc/redis/tls/redis-server-cert.pem
tls-key-file /etc/redis/tls/redis-server-key.pem
tls-ca-cert-file /etc/redis/tls/ca-cert.pem
tls-dh-params-file /etc/redis/tls/redis-dh2048.pem
tls-protocols "TLSv1.2 TLSv1.3"
tls-ciphers "ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS"
tls-ciphersuites "TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256"
tls-prefer-server-ciphers yes
tls-session-caching no
tls-session-cache-size 5000
tls-session-cache-timeout 60
```

## 🔐 Authentication & Authorization

### 1. Strong Password Policy

```bash
# Generate strong Redis password
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo "Generated Redis password: $REDIS_PASSWORD"

# Store in environment variables
export REDIS_PASSWORD="$REDIS_PASSWORD"
```

### 2. Redis ACL Configuration

```conf
# redis.conf - ACL settings
aclfile /etc/redis/users.acl
```

```acl
# /etc/redis/users.acl
user default off

# Application user with limited permissions
user fitnessmealplanner-app on >${REDIS_PASSWORD} ~* &* +@all -@dangerous -flushall -flushdb -shutdown -debug -eval -script

# Read-only monitoring user
user monitoring-readonly on >${MONITORING_PASSWORD} ~* &* +@read +info +ping +client +config|get

# Admin user for maintenance (use only when needed)
user admin off >${ADMIN_PASSWORD} ~* &* +@all

# Session-only user for session storage
user session-store on >${SESSION_PASSWORD} ~session:* &* +@write +@read +del +expire +ttl
```

### 3. Environment Variable Security

```bash
# .env.production (never commit this file)
REDIS_PASSWORD=your-super-secure-password-here
REDIS_SESSION_PASSWORD=session-specific-password
REDIS_MONITORING_PASSWORD=monitoring-read-only-password
REDIS_ADMIN_PASSWORD=admin-emergency-password

# Use Docker secrets in production
echo "$REDIS_PASSWORD" | docker secret create redis-password -
echo "$SESSION_PASSWORD" | docker secret create redis-session-password -
```

## 🚫 Command Restrictions

### 1. Disable Dangerous Commands

```conf
# redis.conf - Command restrictions
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command KEYS ""
rename-command PEXPIRE ""
rename-command DEL ""
rename-command CONFIG ""
rename-command SHUTDOWN SHUTDOWN_FITNESSMEALPLANNER_2024
rename-command EVAL ""
rename-command SCRIPT ""
rename-command DEBUG ""
rename-command MIGRATE ""
rename-command SORT ""
rename-command DUMP ""
rename-command RESTORE ""
```

### 2. Command Filtering by User

```acl
# Allow only safe commands for application users
+@read +@write +@list +@set +@hash +@string +@stream
-@dangerous -@admin -@scripting -@connection
```

## 📊 Monitoring & Logging

### 1. Security Logging Configuration

```conf
# redis.conf - Security logging
syslog-enabled yes
syslog-ident redis-fitnessmealplanner
syslog-facility local0
loglevel notice

# Log all commands (be careful in production - high I/O)
# slowlog-log-slower-than 0  # Enable only for security auditing
```

### 2. Log Monitoring Script

```bash
#!/bin/bash
# redis-security-monitor.sh
LOG_FILE="/var/log/redis/redis-server.log"
ALERT_EMAIL="security@evofitmeals.com"

# Monitor for security events
tail -F "$LOG_FILE" | while read line; do
    # Check for authentication failures
    if echo "$line" | grep -q "WRONGPASS"; then
        echo "SECURITY ALERT: Authentication failure detected"
        echo "$line" | mail -s "Redis Security Alert" "$ALERT_EMAIL"
    fi
    
    # Check for dangerous command attempts
    if echo "$line" | grep -qE "(FLUSHALL|FLUSHDB|CONFIG|DEBUG)"; then
        echo "SECURITY ALERT: Dangerous command attempted"
        echo "$line" | mail -s "Redis Security Alert" "$ALERT_EMAIL"
    fi
    
    # Check for unusual connection patterns
    if echo "$line" | grep -q "Connection from"; then
        CLIENT_IP=$(echo "$line" | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+')
        # Add IP whitelist checking here
    fi
done
```

## 🔍 Security Auditing

### 1. Regular Security Checks

```bash
#!/bin/bash
# redis-security-audit.sh

echo "Redis Security Audit - $(date)"
echo "================================="

# Check Redis configuration
echo "1. Configuration Security Check:"
redis-cli CONFIG GET "*" | grep -E "(requirepass|rename-command|bind|protected-mode)"

# Check active connections
echo "2. Active Connections:"
redis-cli CLIENT LIST

# Check ACL users
echo "3. ACL Users:"
redis-cli ACL LIST

# Check dangerous commands
echo "4. Dangerous Commands Status:"
redis-cli COMMAND INFO FLUSHALL FLUSHDB CONFIG DEBUG EVAL

# Check TLS status
echo "5. TLS Configuration:"
redis-cli CONFIG GET "tls-*"

# Check memory usage patterns
echo "6. Memory Usage:"
redis-cli INFO memory | grep -E "(used_memory|maxmemory)"
```

### 2. Automated Security Validation

```python
#!/usr/bin/env python3
# redis-security-validator.py

import redis
import ssl
import os
from datetime import datetime

def validate_redis_security():
    """Comprehensive Redis security validation"""
    
    # Connection with TLS
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    
    try:
        r = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            password=os.getenv('REDIS_PASSWORD'),
            ssl=True,
            ssl_cert_reqs=ssl.CERT_NONE,
            ssl_ca_certs=None,
            ssl_certfile=None,
            ssl_keyfile=None,
            decode_responses=True
        )
        
        print(f"Redis Security Validation - {datetime.now()}")
        print("=" * 50)
        
        # Test 1: Authentication required
        try:
            redis.Redis(host=os.getenv('REDIS_HOST'), port=6379).ping()
            print("❌ FAIL: Redis accessible without authentication")
        except redis.AuthenticationError:
            print("✅ PASS: Authentication required")
        
        # Test 2: Dangerous commands disabled
        dangerous_commands = ['FLUSHALL', 'FLUSHDB', 'CONFIG', 'DEBUG', 'EVAL']
        for cmd in dangerous_commands:
            try:
                r.execute_command(cmd)
                print(f"❌ FAIL: Dangerous command {cmd} is enabled")
            except redis.ResponseError as e:
                if "unknown command" in str(e).lower():
                    print(f"✅ PASS: Dangerous command {cmd} disabled")
                else:
                    print(f"⚠️  WARN: {cmd} error: {e}")
        
        # Test 3: TLS enabled
        try:
            redis.Redis(host=os.getenv('REDIS_HOST'), port=6379, ssl=False).ping()
            print("❌ FAIL: Non-TLS connection possible")
        except:
            print("✅ PASS: TLS required for connections")
        
        # Test 4: ACL users configured
        users = r.execute_command('ACL', 'LIST')
        if len(users) > 1:  # More than just default user
            print(f"✅ PASS: ACL configured with {len(users)} users")
        else:
            print("❌ FAIL: No ACL users configured")
        
        print("\nSecurity validation completed")
        
    except Exception as e:
        print(f"❌ CRITICAL: Cannot connect to Redis: {e}")

if __name__ == "__main__":
    validate_redis_security()
```

## 🔄 Security Maintenance

### 1. Regular Security Updates

```bash
#!/bin/bash
# redis-security-update.sh

# Update Redis to latest security patch
echo "Updating Redis to latest version..."
docker pull redis:7-alpine

# Rotate passwords quarterly
echo "Password rotation reminder - Last rotated: $(date -d '90 days ago')"

# Update TLS certificates before expiry
echo "Checking TLS certificate expiry..."
openssl x509 -in /etc/redis/tls/redis-server-cert.pem -noout -dates

# Backup security configuration
tar -czf "redis-security-backup-$(date +%Y%m%d).tar.gz" \
    /etc/redis/users.acl \
    /etc/redis/tls/ \
    redis.conf
```

### 2. Incident Response Procedures

```markdown
# Redis Security Incident Response

## Immediate Actions (First 15 minutes)
1. Isolate the Redis instance (block network access)
2. Capture memory dump for forensics
3. Check logs for unauthorized access
4. Notify security team

## Investigation Phase (Next 30 minutes)
1. Analyze access logs
2. Check for data exfiltration
3. Identify attack vector
4. Document timeline

## Recovery Phase (Next 60 minutes)
1. Rotate all Redis passwords
2. Update ACL configurations
3. Restore from clean backup if needed
4. Implement additional security controls

## Post-Incident (Within 24 hours)
1. Complete incident report
2. Update security procedures
3. Conduct security review
4. Schedule security training
```

## 📋 Security Checklist

### Production Deployment Checklist

- [ ] Redis deployed in private VPC
- [ ] Firewall rules configured (only app access)
- [ ] TLS/SSL enabled and configured
- [ ] Strong passwords generated and stored securely
- [ ] ACL users configured with minimal privileges
- [ ] Dangerous commands disabled/renamed
- [ ] Security logging enabled
- [ ] Monitoring and alerting configured
- [ ] Regular backup schedule implemented
- [ ] Security audit scripts deployed
- [ ] Incident response procedures documented
- [ ] Security team contact information updated

### Monthly Security Review

- [ ] Review access logs for anomalies
- [ ] Update Redis to latest security patches
- [ ] Rotate service account passwords
- [ ] Review and update ACL permissions
- [ ] Test backup and restore procedures
- [ ] Verify monitoring and alerting functionality
- [ ] Review firewall rules and network access
- [ ] Conduct penetration testing
- [ ] Update security documentation
- [ ] Train team on security procedures

## 🚨 Emergency Contacts

```bash
# Emergency Security Contacts
SECURITY_TEAM="security@evofitmeals.com"
DEVOPS_ONCALL="+1-XXX-XXX-XXXX"
INCIDENT_RESPONSE_CHAT="#security-incidents"

# Automated alerting
PAGERDUTY_INTEGRATION_KEY="your-pagerduty-key"
SLACK_WEBHOOK="https://hooks.slack.com/services/your/webhook/url"
```

## 📚 Security Resources

- [Redis Security Documentation](https://redis.io/topics/security)
- [DigitalOcean VPC Security Best Practices](https://docs.digitalocean.com/products/networking/vpc/)
- [OWASP Database Security Guidelines](https://owasp.org/www-project-database-security/)
- [Redis ACL Documentation](https://redis.io/topics/acl)
- [TLS Configuration Guide](https://redis.io/topics/encryption)

---

**Security Note**: This configuration prioritizes security over convenience. In production, always err on the side of security and regularly review and update these configurations based on the latest security best practices and threat intelligence.