# Database Security Documentation

## Tables Without RLS Policies

This document explains why certain tables in the Imperial Trading Platform do not have Row Level Security (RLS) policies.

### Overview

Row Level Security (RLS) is a critical security feature in PostgreSQL that restricts which rows a user can access based on defined policies. However, not all tables require RLS policies, as some are managed through other security mechanisms or are intentionally accessible to all authenticated users.

### Tables Without RLS Policies

#### 1. **Internal System Tables**
Some tables are used purely for internal system operations and are not directly accessible to end users through the application layer:

- **`cron_job_logs`**: System-level logging table for background jobs
  - **Security**: Protected by service role authentication
  - **Access**: Only accessible through edge functions with service role keys
  - **Reason**: End users don't interact with this table directly

- **`edge_function_telemetry`**: Performance metrics for edge functions
  - **Security**: Service role only
  - **Access**: Admin dashboard reads with admin-level authentication
  - **Reason**: System-level metrics, not user-specific data

#### 2. **Public Reference Data**
Some tables contain public reference data that should be accessible to all authenticated users:

- **`economic_events`**: Public economic calendar data
  - **Security**: Data is public by design
  - **Access**: All authenticated users can view
  - **Reason**: No user-specific restrictions needed; data is public information

- **`learning_pathways`**: Educational pathway definitions
  - **Security**: Public educational content
  - **Access**: All users can view available pathways
  - **Reason**: Publicly available course structure information

#### 3. **Session Management Tables**
Tables that manage temporary session data:

- **`ui_activity_sessions`**: Tracks active UI sessions for real-time features
  - **Security**: Session-based isolation through session IDs
  - **Access**: Users can only access their own sessions via session_id matching
  - **Reason**: Sessions are ephemeral and self-isolating; cleanup handled automatically

#### 4. **Rate Limiting & Throttling**
Tables used for system-level rate limiting:

- **`rate_limits`**: API rate limiting records
  - **Security**: Protected through application logic
  - **Access**: System-level enforcement only
  - **Reason**: Users shouldn't be able to modify their own rate limits

- **`alert_cooldowns`**: Prevents notification spam
  - **Security**: System-managed cooldown periods
  - **Access**: Write-only through system functions
  - **Reason**: Users shouldn't be able to bypass cooldown mechanisms

#### 5. **Read-Only Analytics**
Tables that aggregate anonymized data for analytics:

- **`notification_analytics`**: Aggregated notification metrics
  - **Security**: Contains no user-identifiable information
  - **Access**: Admin-only dashboard access
  - **Reason**: Anonymized aggregate data; RLS not applicable

### Security Best Practices

Even though these tables don't have RLS policies, they are still secure through other mechanisms:

1. **Service Role Protection**: Many tables are only accessible through edge functions using service role authentication
2. **Application-Level Security**: Access is controlled through the application layer
3. **Admin-Only Access**: Some tables are only accessible to users with admin privileges
4. **Public by Design**: Certain tables contain intentionally public data

### When to Add RLS Policies

RLS policies **MUST** be added to a table if:
- The table contains user-specific data (user_id column)
- Users need to directly query the table from the client
- The table contains sensitive information that requires row-level filtering
- Users should only see their own records

### When RLS Policies Are NOT Required

RLS policies are not required when:
- The table is only accessible through service role (edge functions)
- The table contains public reference data
- Access is controlled entirely through the application layer
- The table is for system-level operations only

### Audit Trail

This document should be reviewed whenever:
- A new table is created
- A table's access pattern changes
- New security requirements are identified
- A security audit is performed

**Last Updated**: 2025-10-08
**Reviewed By**: AI Security Audit - Phase 2
**Next Review Date**: 2025-11-08
