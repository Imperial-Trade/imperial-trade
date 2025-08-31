# Rollback Rehearsal - Timed Execution

## Rollback Scenario: Critical Issue Detection Post-Launch
**Trigger**: High error rate detected in monitoring (>5% 4xx/5xx responses)

### Step 1: Emergency RLS Disable (30 seconds)
```sql
-- Execute immediately to stop new requests
ALTER TABLE rate_limits DISABLE ROW LEVEL SECURITY;
```
**Expected Time**: 30 seconds
**Verification**: `SELECT * FROM rate_limits LIMIT 1;` returns data

### Step 2: Rate Limit Settings Rollback (60 seconds)  
```sql
-- Reset to safe conservative limits
UPDATE rate_limit_settings 
SET email_max_attempts = 1, ip_max_attempts = 5
WHERE id = 1;
```
**Expected Time**: 60 seconds  
**Verification**: Settings query confirms update

### Step 3: Unique Index Recreation (2-3 minutes)
```sql
-- Drop and recreate if corruption suspected
DROP INDEX IF EXISTS idx_rate_limits_unique_identifier_type;
CREATE UNIQUE INDEX idx_rate_limits_unique_identifier_type 
ON rate_limits(identifier, limit_type);
```
**Expected Time**: 2-3 minutes
**Verification**: Index exists and enforces uniqueness

### Step 4: Function Rollback (2-3 minutes)
```sql
-- Deploy previous stable version of edge function
-- Via Supabase dashboard or CLI deployment
```
**Expected Time**: 2-3 minutes
**Verification**: Function logs show successful deployment

### Step 5: Verification & Monitoring (1-2 minutes)
- Check error rates return to normal (<1%)
- Verify account request flow functional
- Confirm no duplicate entries possible
- Monitor for 5 minutes post-rollback

**Total Rollback Time**: 5-10 minutes maximum

## Rollback Communication
- Slack alert: "Account request system rolled back - investigating" 
- Status page update: "Account requests temporarily disabled"
- Internal notification: "Rollback completed, monitoring for stability"

## Prevention Measures
- Staging parity maintained
- Monitoring alerts configured  
- Rollback procedures tested
- Emergency contacts identified