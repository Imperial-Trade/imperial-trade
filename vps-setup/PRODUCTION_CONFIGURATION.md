# 🔒 Production Configuration Guide

## 🎯 Final Pro Tips for Production Deployment

This document covers the three critical optimizations for production-ready deployment.

---

## 1. RAM Monitoring & Management

### The Problem
Each MT5 Terminal instance in portable mode typically consumes **100MB to 250MB of RAM**.

**Calculation**:
- 50 terminals × 250MB = **12.5GB RAM** (worst case)
- 50 terminals × 100MB = **5GB RAM** (best case)

### The Solution

**Monitor RAM Usage**:
```powershell
# Real-time monitoring
pm2 monit

# Check current memory usage
pm2 status
```

**Key Metrics**:
- **Total RAM Usage**: Should stay under 80% of available RAM
- **Per-Process Memory**: Broker service should stay under 500MB
- **Terminal Pool Utilization**: Check via `GET /terminals/stats`

**Actions**:

1. **If RAM usage > 90%**:
   - Reduce `MT5_MAX_TERMINALS` in `.env` (e.g., from 50 to 30)
   - Upgrade VPS RAM
   - Implement terminal timeout/cleanup

2. **Optimize Terminal Pool Size**:
   ```env
   # In .env file
   MT5_MAX_TERMINALS=30  # Reduce if RAM is limited
   ```

3. **Monitor Terminal Acquisition**:
   ```powershell
   # Check terminal stats via API
   curl http://localhost:3001/terminals/stats -H "X-API-Key: YOUR_KEY"
   ```

**Recommended VPS RAM**:
- **Minimum**: 8GB (for 30 terminals)
- **Recommended**: 16GB (for 50 terminals)
- **Ideal**: 32GB (for 50 terminals + headroom)

---

## 2. Firewall Lockdown (Security)

### The Problem
Anyone on the internet can attempt to brute-force your port 3001, even with API key validation.

### The Solution

**Configure Windows Firewall** to only allow traffic from Supabase Edge Function IP ranges.

**Run the Firewall Configuration Script**:
```powershell
# Run as Administrator
.\vps-setup\CONFIGURE_FIREWALL.ps1
```

**What It Does**:
- Creates firewall rules for port 3001
- Restricts access to Cloudflare IP ranges (where Supabase Edge Functions run)
- Blocks all other traffic to port 3001

**Manual Configuration** (if script doesn't work):

```powershell
# Allow specific IP range (example)
New-NetFirewallRule `
    -DisplayName "Imperial Trade Broker Service" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 3001 `
    -RemoteAddress "173.245.48.0/20" `  # Cloudflare IP range
    -Action Allow
```

**Alternative: Cloud Provider Firewall**:

If using Vultr, AWS, or similar:
1. Configure cloud firewall rules in provider dashboard
2. Allow port 3001 only from Cloudflare IP ranges
3. This is more secure than Windows Firewall alone

**IP Range Sources**:
- Cloudflare IP Ranges: https://api.cloudflare.com/client/v4/ips
- Update firewall rules periodically as IPs change

**Security Layers** (Defense in Depth):
1. ✅ Cloud Provider Firewall (first line)
2. ✅ Windows Firewall (second line)
3. ✅ API Key Validation (application level)

---

## 3. Database Connection Pooling (Supabase)

### The Problem
As you scale to thousands of users with the "Push" (Auto-Sync) strategy:
- Your VPS makes many direct connections to Supabase/Postgres
- Each connection consumes database resources
- You can exhaust the connection limit (default: 60-100)

### The Solution

**Use Supabase Connection Pooler** instead of direct database connection.

**⚠️ CRITICAL: Use Transaction Mode (not Session Mode)**

**Pro Tip**: For auto-syncing trades (many quick "write" operations), use **Transaction Mode** instead of Session Mode.

**Why?**
- Transaction Mode: Pooler kills the connection immediately after each transaction
- Session Mode: Connection stays alive for the entire session
- **Result**: Transaction Mode allows thousands of concurrent users with minimal connections

### Configuration

**❌ WRONG (Direct Connection)**:
```env
# Direct connection - exhausts connection limit
SUPABASE_URL=https://kmuoqkcxguafxulqlbmi.supabase.co
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.kmuoqkcxguafxulqlbmi.supabase.co:5432/postgres
```

**✅ CORRECT (Connection Pooler)**:
```env
# Connection pooler - handles many connections efficiently
SUPABASE_URL=https://kmuoqkcxguafxulqlbmi.supabase.co
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Where to Find Connection Pooler URL**:

1. Go to Supabase Dashboard
2. Navigate to: **Settings → Database**
3. Scroll to **Connection Pooling**
4. Copy the **Connection String (Transaction Mode)** or **Connection String (Session Mode)**
5. Update `.env` file on VPS

**Port Differences**:
- **5432**: Direct connection (max ~100 connections)
- **6543**: Connection pooler (handles thousands of connections)

**Update Auto-Sync Service**:

Check `vps-broker-service/src/auto-sync.ts`:
```typescript
// Should use DATABASE_URL from .env (with pooler port 6543)
const SUPABASE_URL = getEnvVar('SUPABASE_URL');
// If using direct database access, use DATABASE_URL with pooler
const DATABASE_URL = getEnvVar('DATABASE_URL');
```

**For REST API Calls** (already using pooler):
- `auto-sync.ts` uses REST API (`/rest/v1/`) - automatically uses pooler ✅
- No changes needed if only using REST API

**For Direct Database Access** (if added later):
- Use `DATABASE_URL` with port 6543 (Transaction Mode)
- Install PostgreSQL client library
- Use connection pooling library (e.g., `pg` with pool config)
- **Important**: Always use Transaction Mode for auto-sync operations

**Where to Find Transaction Mode Connection String**:
1. Go to Supabase Dashboard
2. Navigate to: **Settings → Database**
3. Scroll to **Connection Pooling**
4. **Select "Transaction Mode"** (not Session Mode)
5. Copy the **Connection String (Transaction Mode)**
6. Update `.env` file on VPS

---

## 4. Windows Session 0 & RDP Logout Issue

### The Problem
When you disconnect from RDP (Remote Desktop), Windows sometimes suspends the graphical interface (GUI).

**The Risk**: 
- MT5 (even in portable mode) is a GUI application
- It can "freeze" if the Windows user session is locked or logged out
- Auto-syncs may stop working when you close your RDP window

### The Solution

**Option 1: Use tscon.exe to Keep Session Active**

Disconnect from RDP while keeping the session "Active" and the GUI rendering:

```powershell
# Run this command BEFORE closing RDP (as Administrator)
tscon.exe %sessionname% /dest:console
```

This command:
- Disconnects you from RDP
- Keeps the session active
- Allows GUI applications to continue running
- MT5 terminals remain functional

**Create a Disconnect Script** (`disconnect-rdp-safely.ps1`):
```powershell
# Disconnect RDP while keeping session active
$session = (Get-Process -Id $PID).SessionId
$sessionName = (quser | Select-String ".*$session").ToString().Split()[1]

tscon.exe $sessionName /dest:console
Write-Host "✅ Disconnected from RDP. Session remains active." -ForegroundColor Green
```

**Option 2: Use Windows Scheduled Tasks**

Run the broker service as a Windows Service or Scheduled Task:
- Services run in Session 0 (not affected by RDP logout)
- More reliable for production environments

**Option 3: Use a Screen Session Alternative (Windows)**

Use tools like:
- **nssm** (Non-Sucking Service Manager) to run Node.js as Windows Service
- **pm2-windows-service** to run PM2 as Windows Service

**Recommendation**: For production, run PM2 as a Windows Service to avoid RDP issues entirely.

---

## 5. Rate Limiting vs. Broker Bans

### The Problem
Your VPS has a 100 requests/minute rate limit. This protects your VPS, but you must also consider the **Broker's firewall**.

**The Risk**:
- If 50 terminals all try to log in to the same Broker Server (e.g., ECMarketsLtd-Demo) at the exact same second
- All requests come from the same VPS IP
- Broker might flag your IP for Brute Force or DDoS attack
- Result: Broker bans your IP or requires additional verification

### The Solution

**Stagger Login Attempts** using BullMQ Queue delays.

**Current Implementation**: Queue processes jobs as fast as possible (no delay).

**Recommended Fix**: Add delay between jobs to stagger logins:

**File**: `vps-broker-service/src/queue-manager.ts`

**Add delay configuration**:
```typescript
// Add delay between jobs to stagger logins (prevents broker bans)
const LOGIN_DELAY_MS = parseInt(process.env.LOGIN_DELAY_MS || '500', 10); // 500ms default

// In queueConnectionTest and queueFetchTrades:
const job = await connectionTestQueue.add(
  'mt5-connection-test',
  jobData,
  {
    delay: LOGIN_DELAY_MS, // Stagger logins by 500ms
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
);
```

**Configuration** (in `.env`):
```env
# Stagger login attempts to prevent broker bans (milliseconds)
LOGIN_DELAY_MS=500  # 500ms = 2 logins per second max
```

**Delay Recommendations**:
- **500ms delay**: 2 logins/second (120/minute) - Safe for most brokers
- **1000ms delay**: 1 login/second (60/minute) - Very safe, slower throughput
- **2000ms delay**: 1 login/2 seconds (30/minute) - Ultra-safe, slower throughput

**Alternative: Per-Broker Rate Limiting**

If using multiple brokers, stagger per broker:

```typescript
// Different delays per broker
const getDelayForBroker = (brokerType: string): number => {
  const delays: Record<string, number> = {
    'ecmarkets': 500,
    'icmarkets': 1000,
    'fxpro': 750,
    // ... other brokers
  };
  return delays[brokerType] || 500; // Default 500ms
};
```

**Monitor for Broker Ban Signs**:

Watch for these MT5 errors in logs:
- `(-6, 'Terminal: Authorization failed')` - Repeated failures
- `(-10004, 'IPC no ipc')` - Connection refused
- `(-10005, 'Internal timeout')` - Timeouts

**If Broker Ban Detected**:
1. Increase `LOGIN_DELAY_MS` to 1000ms or 2000ms
2. Temporarily reduce `MT5_MAX_TERMINALS` to 10-20
3. Contact broker support if issues persist
4. Consider using multiple VPS IPs for very high scale

---

## 📋 Production Checklist

Before going live, verify:

- [ ] **RAM Configuration**:
  - [ ] VPS has sufficient RAM (16GB+ recommended)
  - [ ] `MT5_MAX_TERMINALS` set appropriately for RAM
  - [ ] Monitoring set up (`pm2 monit`)

- [ ] **Firewall Configuration**:
  - [ ] Windows Firewall configured (port 3001 restricted)
  - [ ] Cloud provider firewall configured (if applicable)
  - [ ] API key validation working
  - [ ] Test from Supabase Edge Function (should work)
  - [ ] Test from other IP (should fail)

- [ ] **Database Connection**:
  - [ ] Using Connection Pooler (port 6543)
  - [ ] `DATABASE_URL` updated in `.env`
  - [ ] Tested connection pooler connection
  - [ ] Monitoring connection count in Supabase

- [ ] **Service Configuration**:
  - [ ] `.env` file format correct (no quotes/spaces)
  - [ ] All secrets configured
  - [ ] Service running (`pm2 status`)
  - [ ] Both services running (Broker + Price Feeder)

- [ ] **Monitoring**:
  - [ ] Logs accessible (`pm2 logs`)
  - [ ] Terminal cleanup verified
  - [ ] Memory usage monitored
  - [ ] Error alerts configured (optional)

---

## 🧪 Testing Commands

### Test RAM Usage
```powershell
# Real-time monitoring
pm2 monit

# Check current usage
pm2 status
Get-Process | Where-Object {$_.Name -like "*node*" -or $_.Name -like "*terminal64*"} | Measure-Object -Property WorkingSet -Sum
```

### Test Firewall
```powershell
# From another machine (should fail)
curl http://YOUR_VPS_IP:3001/health

# From Supabase Edge Function (should succeed)
# Test via browser console or Edge Function test
```

### Test Connection Pooler
```powershell
# Check connection count in Supabase Dashboard
# Settings → Database → Connection Pooling → Active Connections
# Should see connections when auto-sync is running
```

---

## 🚨 Monitoring Alerts

**Recommended Alerts** (set up monitoring):

1. **RAM Usage > 90%**: Alert immediately
2. **Terminal Pool Exhausted**: All terminals busy
3. **Service Crash**: PM2 process stopped
4. **Database Connection Limit**: Approaching max connections
5. **API Key Failures**: High number of 401 errors

---

## 📊 Performance Benchmarks

**Expected Performance**:
- Connection Test: < 5 seconds
- Trade Fetch: < 30 seconds (depends on history size)
- Terminal Acquisition: < 100ms
- Terminal Release: < 50ms

**Resource Usage**:
- Broker Service: 200-500MB RAM
- Each MT5 Terminal: 100-250MB RAM
- Total (50 terminals): 5-12.5GB RAM

---

## ✅ Conclusion

By implementing these three optimizations:
1. ✅ RAM monitoring prevents resource exhaustion
2. ✅ Firewall lockdown prevents brute-force attacks
3. ✅ Connection pooling prevents database exhaustion

**You have a production-ready, enterprise-grade MT5 broker service!** 🚀
