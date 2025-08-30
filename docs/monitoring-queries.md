# Production Monitoring Queries & Alerts

## Edge Function Performance Monitoring

### 1. Block vs Allowed Rates

**Query for account-request-rate-limit function:**
```sql
-- Daily rate limit decisions
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE event_message LIKE '%"allowed":true%') as allowed_requests,
  COUNT(*) FILTER (WHERE event_message LIKE '%"allowed":false%') as blocked_requests,
  ROUND(
    (COUNT(*) FILTER (WHERE event_message LIKE '%"allowed":false%') * 100.0 / COUNT(*)), 2
  ) as block_percentage
FROM function_edge_logs 
WHERE function_name = 'account-request-rate-limit'
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

**Alert Threshold:** Block rate > 15% indicates potential attack or misconfiguration

### 2. Edge Function 4xx/5xx Errors

**Query for error spike detection:**
```sql
-- Hourly error rates by function
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  function_name,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 500) as client_errors_4xx,
  COUNT(*) FILTER (WHERE status_code >= 500) as server_errors_5xx,
  ROUND(
    (COUNT(*) FILTER (WHERE status_code >= 400) * 100.0 / COUNT(*)), 2
  ) as error_percentage
FROM function_edge_logs 
WHERE function_name IN ('account-request-rate-limit', 'account-approval', 'account-status-check')
  AND timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp), function_name
HAVING COUNT(*) FILTER (WHERE status_code >= 400) > 0
ORDER BY hour DESC, error_percentage DESC;
```

**Alert Thresholds:**
- 4xx errors > 10% of requests in any hour
- 5xx errors > 1% of requests in any hour
- Any 5xx errors for more than 5 minutes consecutively

### 3. IP Source Distribution Analysis

**Query for unusual IP patterns:**
```sql
-- IP source analysis for rate limiting
SELECT 
  DATE(timestamp) as date,
  CASE 
    WHEN event_message LIKE '%CF-Connecting-IP%' THEN 'cloudflare'
    WHEN event_message LIKE '%X-Forwarded-For%' THEN 'proxy'
    WHEN event_message LIKE '%session-based%' THEN 'fallback'
    ELSE 'unknown'
  END as ip_source_type,
  COUNT(*) as request_count,
  COUNT(DISTINCT SUBSTRING(event_message FROM '"identifier":"([^"]+)"')) as unique_ips
FROM function_edge_logs 
WHERE function_name = 'account-request-rate-limit'
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp), ip_source_type
ORDER BY date DESC, request_count DESC;
```

**Alert Threshold:** > 50% fallback to session-based IP detection indicates proxy/CDN issues

## Saved Monitoring Queries

### Query 1: Daily Rate Limiting Summary
```sql
-- Save as: daily_rate_limit_summary
SELECT 
  DATE(fel.timestamp) as date,
  COUNT(*) as total_rate_checks,
  COUNT(*) FILTER (WHERE fel.event_message::jsonb->>'allowed' = 'true') as allowed,
  COUNT(*) FILTER (WHERE fel.event_message::jsonb->>'allowed' = 'false') as blocked,
  COUNT(*) FILTER (WHERE fel.event_message::jsonb->'limitType' ? 'email') as email_checks,
  COUNT(*) FILTER (WHERE fel.event_message::jsonb->'limitType' ? 'ip') as ip_checks,
  ROUND(AVG(fel.execution_time_ms), 2) as avg_response_time_ms
FROM function_edge_logs fel
WHERE fel.function_name = 'account-request-rate-limit'
  AND fel.timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(fel.timestamp)
ORDER BY date DESC;
```

### Query 2: Account Request Flow Health
```sql
-- Save as: account_flow_health
SELECT 
  DATE(timestamp) as date,
  function_name,
  COUNT(*) as requests,
  COUNT(*) FILTER (WHERE status_code = 200) as success,
  COUNT(*) FILTER (WHERE status_code >= 400) as errors,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_response_time
FROM function_edge_logs
WHERE function_name IN ('account-request-rate-limit', 'account-approval', 'account-status-check')
  AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(timestamp), function_name
ORDER BY date DESC, function_name;
```

### Query 3: Suspicious Activity Detection
```sql
-- Save as: suspicious_activity_alerts
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) FILTER (WHERE event_message LIKE '%"allowed":false%') as blocks_per_hour,
  COUNT(DISTINCT SUBSTRING(event_message FROM '"identifier":"([^"]+)"')) as unique_blocked_identifiers,
  STRING_AGG(DISTINCT 
    CASE WHEN event_message LIKE '%email%' THEN 'email' 
         WHEN event_message LIKE '%ip%' THEN 'ip' 
    END, ', ') as block_types
FROM function_edge_logs
WHERE function_name = 'account-request-rate-limit'
  AND event_message LIKE '%"allowed":false%'
  AND timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp)
HAVING COUNT(*) > 10  -- More than 10 blocks per hour
ORDER BY hour DESC;
```

## Alert Configuration

### Recommended Alert Rules

1. **High Block Rate Alert**
   - Metric: Block percentage > 20% for any hour
   - Severity: Warning
   - Action: Review rate limit settings and logs

2. **Edge Function Error Spike**
   - Metric: 4xx/5xx errors > 5% for 15+ minutes
   - Severity: Critical
   - Action: Check function logs and health

3. **IP Source Fallback Alert**
   - Metric: > 60% requests using session-based IP detection
   - Severity: Warning
   - Action: Check CDN/proxy configuration

4. **Suspicious Activity Alert**
   - Metric: > 50 blocks from unique identifiers per hour
   - Severity: High
   - Action: Review for potential attacks

### Supabase Dashboard Links

- **Edge Function Logs:** `https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions/account-request-rate-limit/logs`
- **Database Performance:** `https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/reports/database`
- **API Performance:** `https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/reports/api`

## Implementation Steps

1. **Set up monitoring queries** in Supabase SQL Editor
2. **Configure alerting** via Supabase Dashboard → Settings → Notifications
3. **Create dashboard widgets** for key metrics
4. **Set up external monitoring** (optional) via webhook notifications
5. **Document escalation procedures** for each alert type

## Sample Alert Webhook

```json
{
  "alert_name": "High Rate Limit Block Rate",
  "severity": "warning",
  "metric": "Block percentage: 25%",
  "threshold": "20%",
  "time_window": "Last hour",
  "runbook": "https://docs.company.com/runbooks/rate-limiting",
  "dashboard_link": "https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions"
}
```