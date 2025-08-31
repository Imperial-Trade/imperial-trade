# Staging E2E Execution Report

## Test Execution Summary

### Suppressed Email Suite (EMAIL_ENABLED=false)
**Status**: ✅ PASSED
- Account request with email suppressed: PASSED
- Rate limit enforcement with email suppressed: PASSED  
- Password reset flow (unchanged): PASSED

**Execution Time**: 45.2s
**Browser**: Chromium 130.0.6723.69
**Screenshots**: 8 captured, 0 failures

### Real Send Suite (EMAIL_ENABLED=true)
**Status**: ⚠️ SKIPPED
**Reason**: OneSignal API keys not configured in staging environment

## Artifacts Generated
- `playwright-report/index.html` - Full HTML report
- `test-results/` - Screenshots and traces
- `artifacts.json` - Collected test artifacts
- `parity-report.json` - Environment parity analysis

## Key Validations
✅ Account request form submission successful
✅ Rate limiting triggered after 3 requests
✅ Status page shows pending requests
✅ Duplicate email prevention working
✅ No PII in console logs
✅ Proper error messages displayed

## Performance Metrics
- Form submission: 240ms avg response time
- Page load time: 1.2s avg
- Network requests: All < 500ms

## Security Validations
✅ RLS policies active on rate_limits table
✅ IP address precedence logic working
✅ Unique constraint preventing duplicates
✅ Sanitized logging confirmed