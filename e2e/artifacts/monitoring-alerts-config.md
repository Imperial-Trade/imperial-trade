# Production Monitoring & Alerts Configuration

## 🔔 Alert Configurations - ACTIVE

### Database Connection Monitoring
```sql
-- Alert when connection count exceeds 80% of pool limit
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
-- Threshold: >80 connections
-- Action: Scale connection pool
```

### Edge Function Error Rate
```sql
-- Monitor account-request-rate-limit function errors
SELECT count(*) as error_count
FROM function_edge_logs 
WHERE function_id = 'account-request-rate-limit'
AND event_message LIKE '%error%'
AND timestamp > NOW() - INTERVAL '5 minutes';
-- Threshold: >5 errors in 5 minutes
-- Action: Investigate + rollback if needed
```

### Rate Limit Breach Detection
```sql
-- Monitor for unusual rate limit patterns
SELECT identifier_hash, limit_type, attempt_count, window_start
FROM rate_limits 
WHERE attempt_count >= CASE 
  WHEN limit_type = 'email' THEN 1
  WHEN limit_type = 'ip' THEN 8  -- 80% of IP limit
END
AND window_start > NOW() - INTERVAL '1 hour';
-- Threshold: Multiple IPs hitting 80% of limits
-- Action: Review for potential abuse
```

### Failed Authentication Monitoring
```sql
-- Track authentication failures 
SELECT event_message, metadata, timestamp
FROM auth_logs
WHERE event_message LIKE '%failed%'
AND timestamp > NOW() - INTERVAL '15 minutes';
-- Threshold: >20 failures in 15 minutes
-- Action: Check for brute force attempts
```

## 📊 Dashboard Metrics

### Key Performance Indicators
- **Account Request Success Rate**: Target >95%
- **Rate Limit False Positives**: Target <1%
- **Edge Function Response Time**: Target <500ms p95
- **Database Query Performance**: Target <100ms p95

### Real-time Monitoring
- Active rate limit entries by type (email/IP)
- Function invocation rate and success rate
- Database connection utilization
- Error patterns and frequency

## 🚨 Escalation Procedures

### Level 1: Automated Response
- Function errors → Automatic retry (3x)
- Database connection limits → Pool scaling
- Rate limit breaches → Temporary IP blocking

### Level 2: Manual Investigation (5 min response)
- Sustained error rates >5%
- Unusual traffic patterns
- Authentication failure spikes

### Level 3: Emergency Rollback (<2 min)
- Function completely failing
- Database corruption detected
- Security breach indicators

## 📈 Success Metrics Baseline

### Normal Operation Ranges
- **Account requests**: 10-50 per hour
- **Rate limit hits**: <5% of total requests  
- **Function response time**: 200-500ms
- **Database queries**: <50ms average

### Alert Thresholds
- Error rate: >2% sustained for >5 minutes
- Response time: >1000ms p95 for >3 minutes
- Rate limit abuse: >10 IPs hitting limits simultaneously

## 🔍 Log Analysis Queries

### Identify Suppressed Emails
```sql
SELECT COUNT(*) as suppressed_count
FROM function_edge_logs 
WHERE event_message LIKE '%EMAIL_SUPPRESSED%'
AND timestamp > NOW() - INTERVAL '1 hour';
```

### Rate Limit Effectiveness
```sql
SELECT limit_type, COUNT(*) as blocked_requests
FROM rate_limits 
WHERE attempt_count >= CASE 
  WHEN limit_type = 'email' THEN 1
  WHEN limit_type = 'ip' THEN 10
END
AND window_start > NOW() - INTERVAL '24 hours'
GROUP BY limit_type;
```

### Function Performance Trends
```sql  
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  AVG(execution_time_ms) as avg_response_time,
  COUNT(*) as request_count
FROM function_edge_logs
WHERE function_id = 'account-request-rate-limit'
AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

---
**Status**: 🟢 ALL ALERTS ACTIVE  
**Last Updated**: 2025-01-20T00:00:00Z  
**Next Review**: 24 hours post-deployment