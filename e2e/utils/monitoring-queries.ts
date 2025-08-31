export const monitoringQueries = {
  // Account request error rates
  accountRequestErrors: `
    SELECT 
      DATE_TRUNC('hour', timestamp) as hour,
      COUNT(*) as total_requests,
      COUNT(CASE WHEN event_message LIKE '%error%' OR event_message LIKE '%failed%' THEN 1 END) as errors,
      ROUND(COUNT(CASE WHEN event_message LIKE '%error%' OR event_message LIKE '%failed%' THEN 1 END) * 100.0 / COUNT(*), 2) as error_rate
    FROM function_edge_logs 
    WHERE function_id IN (
      SELECT id FROM functions WHERE name = 'account-request-notifications'
    )
    AND timestamp >= NOW() - INTERVAL '24 hours'
    GROUP BY DATE_TRUNC('hour', timestamp)
    ORDER BY hour DESC;
  `,

  // Rate limit block rates
  rateLimitBlocks: `
    SELECT 
      DATE_TRUNC('hour', timestamp) as hour,
      COUNT(*) as total_checks,
      COUNT(CASE WHEN event_message LIKE '%🔴%' THEN 1 END) as blocks,
      COUNT(CASE WHEN event_message LIKE '%🟢%' THEN 1 END) as allowed,
      ROUND(COUNT(CASE WHEN event_message LIKE '%🔴%' THEN 1 END) * 100.0 / COUNT(*), 2) as block_rate
    FROM function_edge_logs 
    WHERE function_id IN (
      SELECT id FROM functions WHERE name = 'account-request-rate-limit'
    )
    AND timestamp >= NOW() - INTERVAL '24 hours'
    GROUP BY DATE_TRUNC('hour', timestamp)
    ORDER BY hour DESC;
  `,

  // IP source distribution
  ipSourceDistribution: `
    SELECT 
      CASE 
        WHEN event_message LIKE '%IP Source: cf-connecting-ip%' THEN 'cloudflare'
        WHEN event_message LIKE '%IP Source: x-forwarded-for%' THEN 'forwarded'
        WHEN event_message LIKE '%IP Source: x-real-ip%' THEN 'real-ip'
        ELSE 'unknown'
      END as ip_source,
      COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM function_edge_logs WHERE function_id IN (
        SELECT id FROM functions WHERE name = 'account-request-rate-limit'
      ) AND timestamp >= NOW() - INTERVAL '24 hours'), 2) as percentage
    FROM function_edge_logs 
    WHERE function_id IN (
      SELECT id FROM functions WHERE name = 'account-request-rate-limit'
    )
    AND timestamp >= NOW() - INTERVAL '24 hours'
    GROUP BY ip_source
    ORDER BY count DESC;
  `,

  // Email delivery status
  emailDeliveryStatus: `
    SELECT 
      DATE_TRUNC('hour', timestamp) as hour,
      COUNT(*) as total_attempts,
      COUNT(CASE WHEN event_message LIKE '%EMAIL_SUPPRESSED%' THEN 1 END) as suppressed,
      COUNT(CASE WHEN event_message LIKE '%EMAIL_SUCCESS%' THEN 1 END) as delivered,
      COUNT(CASE WHEN event_message LIKE '%EMAIL_ERROR%' THEN 1 END) as failed
    FROM function_edge_logs 
    WHERE function_id IN (
      SELECT id FROM functions WHERE name = 'send-welcome-email'
    )
    AND timestamp >= NOW() - INTERVAL '24 hours'
    GROUP BY DATE_TRUNC('hour', timestamp)
    ORDER BY hour DESC;
  `,

  // Recent account requests
  recentAccountRequests: `
    SELECT 
      created_at,
      email,
      account_type,
      status,
      reason
    FROM public.account_requests 
    WHERE created_at >= NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC
    LIMIT 50;
  `,

  // Rate limit entries  
  rateLimitEntries: `
    SELECT 
      identifier_hash,
      limit_type,
      attempt_count,
      window_start,
      last_attempt
    FROM public.rate_limits
    WHERE last_attempt >= NOW() - INTERVAL '1 hour'
    ORDER BY last_attempt DESC
    LIMIT 20;
  `
};

export const alertThresholds = {
  errorRate: 5.0, // Alert if error rate > 5%
  blockRate: 20.0, // Alert if block rate > 20%
  emailFailureRate: 10.0, // Alert if email failure rate > 10%
  requestVolume: 100 // Alert if requests/hour > 100
};

export const rollbackProcedure = {
  steps: [
    '1. Set EMAIL_ENABLED=false in edge function environment',
    '2. Verify email suppression via edge function logs',
    '3. Monitor error rates return to baseline',
    '4. Check account request flow still functional',
    '5. Document incident and timing'
  ],
  estimatedTime: '5-10 minutes',
  verificationChecks: [
    'EMAIL_SUPPRESSED events in logs',
    'No OneSignal API calls',
    'Account requests still processing',
    'Rate limiting still active'
  ]
};