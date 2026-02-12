# HIPAA Compliance & Security Guide

## Overview

This document outlines security measures and HIPAA compliance requirements for the Research Dashboard. Since this system handles Protected Health Information (PHI) and integrates with REDCap, strict security controls are essential.

## HIPAA Requirements

### Administrative Safeguards
- **Security Officer**: Designate a security officer responsible for HIPAA compliance
- **Workforce Training**: All users must complete HIPAA training
- **Access Management**: Role-based access control (RBAC) with minimum necessary access
- **Audit Controls**: Comprehensive logging of all PHI access and modifications

### Physical Safeguards
- **Workstation Security**: Secure physical access to servers and workstations
- **Media Controls**: Secure storage and disposal of PHI
- **Facility Access**: Controlled access to data centers and server rooms

### Technical Safeguards
- **Access Control**: Unique user identification and authentication
- **Audit Controls**: Logging and monitoring of system activity
- **Integrity**: Protection against unauthorized alteration of PHI
- **Transmission Security**: Encryption of PHI in transit
- **Encryption**: Encryption of PHI at rest (recommended)

## Current Security Implementation

### ✅ Implemented
- JWT-based authentication
- Role-based access control (Admin, Clinician)
- Password hashing with bcrypt
- Protected API endpoints
- CORS configuration
- Database session management

### ⚠️ Needs Enhancement
- Secret key management (currently hardcoded)
- Audit logging
- Data encryption at rest
- Session timeout
- Password policy enforcement
- REDCap API token security
- Error message sanitization
- HTTPS enforcement
- Rate limiting
- Input validation

## Security Enhancements

### 1. Environment Variables & Secrets Management

**Current Issue**: SECRET_KEY is hardcoded in `core/auth.py`

**Solution**: Use environment variables for all secrets

```python
# Use python-dotenv to load from .env file
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable must be set")
```

### 2. Audit Logging

**Requirement**: Log all access to PHI (view, create, update, delete)

**Implementation**:
- Log user actions with timestamps
- Include user ID, action type, resource accessed
- Store logs securely (separate from PHI)
- Retain logs per HIPAA requirements (6 years minimum)

### 3. Data Encryption

**At Rest**:
- Encrypt database files (SQLite encryption or use PostgreSQL with encryption)
- Encrypt uploaded files before storage
- Use encrypted backups

**In Transit**:
- Enforce HTTPS/TLS 1.2+ in production
- Use secure REDCap API connections (HTTPS)
- Validate SSL certificates

### 4. Session Management

**Current**: 30-day token expiration (too long for HIPAA)

**Recommendation**:
- Reduce token expiration to 15-30 minutes of inactivity
- Implement refresh tokens
- Force re-authentication for sensitive operations
- Logout on browser close option

### 5. Password Policy

**Requirements**:
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, special characters
- Password history (prevent reuse)
- Account lockout after failed attempts
- Regular password rotation

### 6. REDCap Integration Security

**Critical Considerations**:
- Store REDCap API tokens encrypted
- Never log API tokens
- Use REDCap's user-based API tokens (not project-level when possible)
- Validate REDCap URL (prevent SSRF attacks)
- Implement token rotation
- Monitor REDCap API usage

### 7. Error Handling

**Current Issue**: Error messages may expose system details

**Solution**:
- Sanitize error messages (no PHI, no stack traces in production)
- Log detailed errors server-side only
- Return generic error messages to clients
- Never expose database structure or query details

### 8. Input Validation

**Requirements**:
- Validate all user inputs
- Sanitize file uploads
- Prevent SQL injection (use parameterized queries - already done)
- Prevent XSS attacks
- Validate file types and sizes
- Scan uploaded files for malware

### 9. Access Controls

**Enhancements**:
- Implement IP whitelisting for admin functions
- Two-factor authentication (2FA) for admin accounts
- Time-based access restrictions
- Geographic access restrictions (if needed)
- Automatic logout after inactivity

### 10. Data Minimization

**Principle**: Only collect and store necessary PHI

**Implementation**:
- Regular data retention reviews
- Secure deletion of old records
- Anonymization for analytics when possible
- Field-level access controls

## Implementation Checklist

### Immediate (Critical)
- [ ] Move SECRET_KEY to environment variables
- [ ] Implement audit logging
- [ ] Enforce HTTPS in production
- [ ] Reduce token expiration time
- [ ] Sanitize error messages
- [ ] Encrypt REDCap API tokens in database

### Short-term (High Priority)
- [ ] Implement password policy
- [ ] Add rate limiting
- [ ] Database encryption at rest
- [ ] File upload encryption
- [ ] Session timeout
- [ ] Input validation enhancements

### Medium-term
- [ ] Two-factor authentication
- [ ] Advanced audit reporting
- [ ] Automated security scanning
- [ ] Penetration testing
- [ ] Security incident response plan

### Long-term
- [ ] Data loss prevention (DLP)
- [ ] Advanced threat detection
- [ ] Regular security assessments
- [ ] Compliance monitoring tools

## REDCap-Specific Security

### API Token Management
1. **Storage**: Encrypt tokens in database
2. **Rotation**: Implement token rotation schedule
3. **Scope**: Use least-privilege tokens
4. **Monitoring**: Log all REDCap API calls
5. **Validation**: Verify REDCap URL format and SSL certificates

### Data Transmission
1. **HTTPS Only**: Require HTTPS for all REDCap connections
2. **Certificate Validation**: Verify SSL certificates
3. **Timeout**: Set reasonable API timeouts
4. **Retry Logic**: Implement secure retry mechanisms

### Access Control
1. **Admin Only**: REDCap integration restricted to admins
2. **Audit Trail**: Log who accessed REDCap and when
3. **Token Access**: Track which tokens are used by which users

## Compliance Documentation

### Required Policies
1. **Access Control Policy**: Who can access what
2. **Password Policy**: Requirements and procedures
3. **Audit Log Policy**: What gets logged and retention
4. **Incident Response Plan**: What to do in case of breach
5. **Data Retention Policy**: How long to keep PHI
6. **Backup and Recovery Plan**: Data protection procedures

### Training Requirements
- All users must complete HIPAA training
- Annual security awareness training
- Role-specific training for admins
- REDCap integration training for authorized users

## Monitoring & Alerts

### Key Metrics to Monitor
- Failed login attempts
- Unusual access patterns
- Large data exports
- Admin actions
- REDCap API usage
- System errors

### Alert Thresholds
- Multiple failed logins from same IP
- Access outside normal hours
- Bulk data access
- Unauthorized access attempts
- System errors exceeding threshold

## Incident Response

### Breach Notification Requirements
- **HIPAA**: Notify within 60 days of discovery
- **Internal**: Immediate notification to security officer
- **Documentation**: Maintain detailed incident logs

### Response Steps
1. Contain the breach immediately
2. Assess scope and impact
3. Notify security officer and legal
4. Document all actions taken
5. Implement remediation measures
6. Notify affected individuals if required
7. Report to HHS if breach affects 500+ individuals

## Best Practices

### Development
- Never commit secrets to version control
- Use secure coding practices
- Regular security code reviews
- Dependency vulnerability scanning
- Automated security testing

### Operations
- Regular security updates
- Monitor security advisories
- Backup encryption
- Secure configuration management
- Regular access reviews

### User Management
- Regular access audits
- Remove access for terminated users immediately
- Review and update roles regularly
- Monitor for suspicious activity
- Enforce strong authentication

## Resources

- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [REDCap Security Best Practices](https://redcap.vanderbilt.edu/consortium/)

## Contact

For security concerns or questions:
- Security Officer: [To be designated]
- IT Support: [Contact information]
- Compliance Officer: [Contact information]
