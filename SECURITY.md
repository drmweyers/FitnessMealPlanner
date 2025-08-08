# Security Guidelines for FitnessMealPlanner

## 🔐 Authentication & Authorization

### JWT Security
- **Strong Secrets**: JWT secrets must be at least 32 characters long
- **Separate Secrets**: Different secrets for access and refresh tokens
- **Algorithm Specification**: Only HS256 algorithm allowed
- **Token Validation**: Strict issuer and audience validation
- **Expiration**: Short-lived access tokens (15 minutes), longer refresh tokens (30 days)

### Password Security
- **Strength Requirements**: 
  - Minimum 8 characters
  - Must contain uppercase, lowercase, numbers, and special characters
- **Hashing**: BCrypt with 12 salt rounds
- **Rate Limiting**: 5 failed attempts = 15 minute lockout

### Cookie Security
- **HttpOnly**: Prevents XSS access to tokens
- **Secure**: HTTPS-only in production
- **SameSite**: 'lax' for CSRF protection

## 🚨 Environment Security

### Secret Management
```bash
# Generate strong JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate cookie secrets  
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Environment Files
- ✅ `.env.example` - Template with placeholders
- ✅ `test/test.env` - Test values only
- ❌ `.env` - Contains real secrets, properly ignored by git
- ❌ Never commit real API keys or secrets

### Required Environment Variables
```
JWT_SECRET=<64-byte-hex-string>
JWT_REFRESH_SECRET=<64-byte-hex-string>
COOKIE_SECRET=<32-byte-hex-string>
DATABASE_URL=<connection-string>
```

## 🛡️ API Security

### Input Validation
- Zod schema validation on all endpoints
- SQL injection protection via parameterized queries
- XSS prevention through data sanitization

### Rate Limiting
- Login attempts: 5 per email per 15 minutes
- API endpoints: Configure per route as needed

### CORS Configuration
- Strict origin validation
- Credentials allowed only for authorized origins
- Preflight request handling

## 🔍 Security Headers

Current security headers implemented:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` 
- `X-XSS-Protection: 1; mode=block`

## 🚨 Critical Security Checklist

### Development Environment
- [ ] Strong JWT secrets generated
- [ ] `.env` file not committed to git
- [ ] Test credentials separate from production
- [ ] Security headers enabled
- [ ] HTTPS in production

### Production Deployment
- [ ] All secrets rotated from development
- [ ] Environment variables in secure vault
- [ ] Database connections encrypted
- [ ] Regular security updates
- [ ] Monitoring and alerting configured

## 📋 Incident Response

If security credentials are compromised:

1. **Immediate Actions**:
   - Rotate all affected secrets
   - Revoke exposed API keys
   - Force logout all users (invalidate tokens)
   - Review access logs

2. **Investigation**:
   - Determine scope of exposure
   - Check for unauthorized access
   - Document timeline of events

3. **Recovery**:
   - Deploy new secrets to all environments
   - Monitor for suspicious activity
   - Update security procedures

## 🔄 Regular Security Maintenance

### Weekly
- Review access logs for anomalies
- Check for failed authentication attempts
- Monitor error rates

### Monthly  
- Rotate JWT secrets
- Update dependencies for security patches
- Review and test backup procedures

### Quarterly
- Full security audit
- Penetration testing
- Update security documentation
- Team security training

## 📞 Reporting Security Issues

If you discover a security vulnerability:
1. **DO NOT** create a public issue
2. Contact the development team privately
3. Provide detailed reproduction steps
4. Allow reasonable time for fix before disclosure

## 🏆 Security Best Practices

### For Developers
1. Use strong, unique secrets for each environment
2. Never log sensitive information
3. Validate all inputs
4. Use parameterized queries
5. Keep dependencies updated
6. Follow principle of least privilege

### For Deployment
1. Use HTTPS everywhere
2. Implement proper monitoring
3. Regular backups and testing
4. Network security (firewalls, VPN)
5. Access control and audit logging

---

**Last Updated**: August 6, 2025  
**Version**: 1.0  
**Review Date**: November 6, 2025