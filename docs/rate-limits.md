
# Rate Limiting System Documentation

## Overview

The Imperial Trading Platform uses a sophisticated server-side rate limiting system to prevent abuse of the account request endpoint while maintaining a smooth user experience.

## Architecture

### Components

1. **Edge Function**: `supabase/functions/account-request-rate-limit/index.ts`
   - Handles all rate limit checks and consumption
   - Uses service role to bypass RLS for system operations
   - Implements real IP detection with fallback chain

2. **Database Table**: `public.rate_limit_settings`
   - Stores configurable rate limit parameters
   - Protected by RLS (admin-only access)
   - Single row with ID=1 for simplicity

3. **Client Service**: `src/services/ServerRateLimitService.ts`
   - Provides clean API for rate limit operations
   - Handles errors gracefully (fail-open approach)

### Real IP Detection Priority

The edge function uses this fallback chain for IP detection:

1. **CF-Connecting-IP** (Cloudflare - highest priority)
2. **X-Forwarded-For** (first IP, port stripped)
3. **Session-based fallback** (deterministic but unique per hour)

All IP sources are logged for monitoring and debugging.

## Current Production Settings

| Type | Limit | Window | Notes |
|------|-------|--------|-------|
| Email | 1 attempt | 24 hours | Per email address |
| IP | 10 attempts | 1 hour | Per IP address |
| Allowlist | Empty | N/A | No IPs currently bypassed |

## Rate Limit States

### Checking vs Consuming

- **Check (consume=false)**: Validates if request would be allowed
- **Consume (consume=true)**: Actually increments the attempt counter

### Response Format

```typescript
interface RateLimitResult {
  allowed: boolean;
  attemptsRemaining: number;
  resetTime: string; // ISO timestamp
  blockedUntil?: string; // ISO timestamp if blocked
}
```

## Staged Rollout Plan

### Phase 1: Current Production (ACTIVE)
- Email: 1/day, IP: 10/hour
- Monitoring and baseline establishment
- No silent behavior changes

### Phase 2: Gradual Increase (PLANNED)
After 1-2 weeks of stability monitoring:

```sql
-- Increase email limits to 3/day
UPDATE public.rate_limit_settings 
SET email_max_attempts = 3 
WHERE id = 1;

-- Increase IP limits to 60/hour
UPDATE public.rate_limit_settings 
SET ip_max_attempts = 60 
WHERE id = 1;
```

### Phase 3: Advanced Features (FUTURE)
- Burst allowances (temporary higher limits)
- Cooldown periods (progressive backoff)
- IP allowlisting for trusted networks
- Geographic rate limiting

## Monitoring and Observability

### Key Metrics

1. **Rate Limit Events**: Check `cron_job_logs` table
2. **Edge Function Logs**: Supabase Function logs
3. **IP Sources**: Distribution of CF-Connecting-IP vs fallbacks
4. **Block Rates**: Percentage of requests blocked

### Log Analysis

```sql
-- Recent rate limit activity
SELECT * FROM cron_job_logs 
WHERE job_name LIKE '%rate%' 
ORDER BY execution_time DESC 
LIMIT 50;

-- Account request success/failure rates
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'pending') as successful
FROM account_requests 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Administration

### Viewing Current Settings

```sql
SELECT * FROM public.rate_limit_settings WHERE id = 1;
```

### Updating Rate Limits

```sql
-- Example: Increase email limit to 5/day
UPDATE public.rate_limit_settings 
SET 
  email_max_attempts = 5,
  updated_at = now()
WHERE id = 1;

-- Example: Add IP to allowlist
UPDATE public.rate_limit_settings 
SET 
  allowlist_cidrs = allowlist_cidrs || ARRAY['192.168.1.0/24'],
  updated_at = now()
WHERE id = 1;
```

### Emergency Procedures

#### Temporarily Disable Rate Limiting

```sql
-- Set very high limits (effectively disabled)
UPDATE public.rate_limit_settings 
SET 
  email_max_attempts = 999999,
  ip_max_attempts = 999999,
  updated_at = now()
WHERE id = 1;
```

#### Clear All Rate Limit Counters

```sql
DELETE FROM public.rate_limits;
```

## Rollback Procedures

### Database Rollback

If issues arise, rollback in this order:

1. **Restore original settings**:
```sql
UPDATE public.rate_limit_settings 
SET 
  email_max_attempts = 1,
  email_window_seconds = 86400,
  ip_max_attempts = 10,
  ip_window_seconds = 3600,
  allowlist_cidrs = '{}',
  updated_at = now()
WHERE id = 1;
```

2. **If table corruption occurs**:
```sql
-- Drop and recreate with defaults
DROP TABLE IF EXISTS public.rate_limit_settings CASCADE;
-- Then re-run the creation migration
```

3. **Emergency fallback to legacy function**:
```sql
-- Remove deprecation comment to re-enable
COMMENT ON FUNCTION public.check_account_request_rate_limit IS NULL;
```

### Code Rollback

If client-side issues occur:
- Revert `ServerRateLimitService.ts` changes
- Re-enable `getClientIP()` calls if needed
- Monitoring will show increased error rates

## Security Considerations

### RLS Protection

- `rate_limit_settings`: Admin-only access
- `rate_limits`: System operations only
- Edge function uses service role (bypasses RLS)

### Unique Constraints

- Email + limit_type uniqueness prevents race conditions
- Single settings row (ID=1) prevents configuration drift

### Fail-Open Design

System fails open (allows requests) if:
- Database connection fails
- Edge function errors occur
- Settings table is missing

This prevents legitimate users from being blocked during system issues.

## Performance Considerations

### Database Impact

- Minimal: Single row reads, occasional updates
- Indexed lookups on (identifier, limit_type)
- Automatic cleanup of old rate limit records

### Edge Function Performance

- Sub-100ms response times typical
- Efficient IP parsing and validation
- Minimal memory footprint

### Client Impact

- Async rate limit checks
- Error handling prevents UI blocking
- Graceful degradation on failures

## Future Enhancements

### Planned Features

1. **Geographic Rate Limiting**: Different limits by country/region
2. **Burst Allowances**: Short-term higher limits for legitimate users
3. **Progressive Backoff**: Increasing delays for repeated violations
4. **Machine Learning**: Anomaly detection for sophisticated attacks

### Integration Opportunities

1. **User Reputation**: Adjust limits based on user history
2. **Risk Scoring**: Dynamic limits based on request patterns
3. **A/B Testing**: Different limits for user cohorts
4. **Real-time Alerts**: Automated notifications for unusual patterns

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Owner**: Imperial Trading Platform Team
