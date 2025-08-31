# Imperial Trading Platform - Go-Live Execution Guide

## Overview
This guide documents the staging validation and production readiness process for the account request system with email notifications.

## Test Suites

### 1. Suppressed Email Flow (Always Run)
```bash
EMAIL_ENABLED=false npx playwright test e2e/go-live-suppressed.spec.ts
```
Tests account request functionality with email notifications suppressed:
- Account request submission and validation
- Rate limiting enforcement
- Password reset flow (unchanged)
- Duplicate email handling

### 2. Real Email Send Flow (Run Only If OneSignal Configured)
```bash
EMAIL_ENABLED=true ONESIGNAL_API_KEY=your_key ONESIGNAL_APP_ID=your_app_id npx playwright test e2e/go-live-real-send.spec.ts
```
Tests actual email delivery (requires OneSignal API keys):
- Real welcome email sending
- Delivery verification
- Email monitoring

### 3. Complete Artifact Collection
```bash
npx playwright test e2e/go-live-runner.spec.ts
```
Orchestrates full go-live validation:
- Environment verification
- Auth settings documentation
- Sanitized log samples
- Monitoring setup
- Production readiness checklist

## Environment Configuration

### Staging Setup
- `EMAIL_ENABLED=true` only when OneSignal keys are present and testing real sends
- `EMAIL_ENABLED=false` for suppressed testing (default)
- OneSignal keys: `ONESIGNAL_API_KEY` and `ONESIGNAL_APP_ID`

### Production Setup (Launch)
- `EMAIL_ENABLED=false` (keep emails suppressed)
- Monitor system stability
- Re-evaluate email enablement after stability window

## Artifacts Generated

All test runs generate artifacts in `test-artifacts/go-live-{timestamp}/`:

### Screenshots
- `account-request-form.png` - Account request interface
- `auth-email-providers.png` - Supabase email provider settings
- `auth-email-templates.png` - Email template configuration
- `auth-url-config.png` - URL configuration settings

### Log Files
- `artifacts.json` - Complete test execution data
- `parity-report.json` - Production readiness assessment

### Sanitized Log Samples
```json
{
  "email_suppressed": {
    "event_type": "EMAIL_SUPPRESSED",
    "function": "send-welcome-email",
    "message": "Email notifications disabled - suppressed welcome email",
    "user_hash": "[HASH_REDACTED]"
  },
  "rate_limit_block": {
    "event_type": "RATE_LIMIT_BLOCK", 
    "function": "account-request-rate-limit",
    "message": "🔴 Rate limit event - Hash: [HASH], Type: email, Allowed: false"
  }
}
```

## Monitoring Queries

### Error Rate Monitoring
```sql
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN event_message LIKE '%error%' THEN 1 END) as errors,
  ROUND(COUNT(CASE WHEN event_message LIKE '%error%' THEN 1 END) * 100.0 / COUNT(*), 2) as error_rate
FROM function_edge_logs 
WHERE function_id IN (SELECT id FROM functions WHERE name = 'account-request-notifications')
AND timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;
```

### Rate Limit Block Rates
```sql
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as total_checks,
  COUNT(CASE WHEN event_message LIKE '%🔴%' THEN 1 END) as blocks,
  ROUND(COUNT(CASE WHEN event_message LIKE '%🔴%' THEN 1 END) * 100.0 / COUNT(*), 2) as block_rate
FROM function_edge_logs 
WHERE function_id IN (SELECT id FROM functions WHERE name = 'account-request-rate-limit')
AND timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;
```

## Alert Thresholds

- **Error Rate**: Alert if > 5%
- **Block Rate**: Alert if > 20% 
- **Email Failure Rate**: Alert if > 10%
- **Request Volume**: Alert if > 100 requests/hour

## Rollback Procedure

**Estimated Time**: 5-10 minutes

### Steps
1. Set `EMAIL_ENABLED=false` in edge function environment
2. Verify email suppression via edge function logs
3. Monitor error rates return to baseline
4. Check account request flow still functional
5. Document incident and timing

### Verification Checks
- `EMAIL_SUPPRESSED` events appear in logs
- No OneSignal API calls being made
- Account requests still processing normally
- Rate limiting remains active

## Production Readiness Checklist

### Security ✅
- RLS policies active on all sensitive tables
- Rate limiting configured and tested
- Input validation implemented
- Email suppression ready for production

### Monitoring ✅ 
- Edge function logs available
- Error tracking implemented
- Alert queries documented
- Sanitized logging verified

### Rollback ✅
- Procedure documented and tested
- Verification steps defined
- Estimated rollback time: 5-10 minutes

### Launch Strategy ✅
- **Email**: Keep suppressed in production initially
- **Monitoring**: Focus on error rates, block rates, system stability
- **Timeline**: Re-evaluate email enablement after stability window

## Manual Steps Required

### Supabase Auth Settings Screenshots
Due to authentication requirements, the following screenshots must be captured manually from the Supabase dashboard:

1. Navigate to: `https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/auth/providers`
2. Capture email provider settings
3. Navigate to email templates and URL configuration
4. Verify settings match expected configuration:
   - Confirm email signup: **Disabled**
   - Enable signup: **Disabled** 
   - Double confirm change: **Disabled**
   - Password reset: **Enabled**

## Expected Configuration

### Current Staging/Prod Settings
- Account request system: **Active**
- Rate limiting: **10 requests/hour per email, 50/hour per IP**
- Email notifications: **Suppressed in prod, conditional in staging**
- Password reset: **Always enabled**
- User signup via form: **Disabled (admin approval required)**

### Security Guardrails Active
- Row Level Security on `account_requests` table
- Unique constraint on email addresses  
- Rate limit enforcement via `rate_limits` table
- Input validation and sanitization
- PII redaction in logs