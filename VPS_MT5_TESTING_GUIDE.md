# 🧪 VPS MT5 Testing Guide - Step by Step

## ✅ **You're Absolutely Right!**
**Test MT5 on VPS first, then test frontend integration.**

---

## 🎯 **Testing Phases**

### **Phase 1: Basic MT5 Installation Check** ✅
### **Phase 2: MT5 Manual Connection Test** ✅
### **Phase 3: Docker Container Test** ✅
### **Phase 4: Go Brain Integration Test** ✅
### **Phase 5: Frontend Integration Test** ✅

---

## 📋 **Phase 1: Basic MT5 Installation Check**

### Step 1.1: SSH into VPS
```bash
ssh root@209.222.12.247
```

### Step 1.2: Verify MT5 Installation
```bash
# Check if MT5 directory exists
ls -lh /root/imperial-factory/mt5-master/terminal64.exe

# Check if Wine is installed
wine --version

# Check if Xvfb is installed
which Xvfb
```

**Expected Output:**
- ✅ `terminal64.exe` file exists (should be ~100MB+)
- ✅ Wine version displayed (e.g., `wine-8.0`)
- ✅ Xvfb path shown (e.g., `/usr/bin/Xvfb`)

---

## 📋 **Phase 2: MT5 Manual Connection Test**

### Step 2.1: Test MT5 with Test Credentials

**Use your test broker credentials:**
- Login: (your test login)
- Password: (your test password)
- Server: (your test server)

### Step 2.2: Create Test launch.ini
```bash
# Create test directory
mkdir -p /root/imperial-factory/test-config

# Create test launch.ini
cat > /root/imperial-factory/test-config/launch.ini << EOF
[Common]
Login=YOUR_TEST_LOGIN
Password=YOUR_TEST_PASSWORD
Server=YOUR_TEST_SERVER
ProxyEnable=0
CertConfirm=1

[Experts]
AllowLiveTrading=1
AllowDllImport=0
Enabled=1
AccountAndConsole=1
WebRequestEnable=1
WebRequestUrl=https://kmuoqkcxguafxulqlbmi.supabase.co
EOF

# Replace YOUR_TEST_LOGIN, YOUR_TEST_PASSWORD, YOUR_TEST_SERVER with actual values
nano /root/imperial-factory/test-config/launch.ini
```

### Step 2.3: Launch MT5 Manually
```bash
# Kill any existing Wine/MT5 processes
wineserver -k
killall -9 wine64 terminal64.exe Xvfb

# Start virtual display
Xvfb :99 -screen 0 1024x768x16 &
export DISPLAY=:99
sleep 2

# Launch MT5 with test config
cd /root/imperial-factory/mt5-master
WINEDEBUG=-all wine terminal64.exe /portable /config:/root/imperial-factory/test-config/launch.ini
```

**Expected Result:**
- ✅ MT5 terminal starts
- ✅ Auto-login occurs (using launch.ini)
- ✅ Connection status shows "Connected"
- ✅ You can see account info (balance, server, etc.)

### Step 2.4: Check MT5 Logs
```bash
# Check MT5 logs for connection status
tail -f ~/.wine/drive_c/Users/Public/Documents/MetaTrader\ 5/MQL5/Logs/*.log

# Or check terminal output for connection messages
```

**What to Look For:**
- ✅ "Connected" messages
- ✅ Account information
- ✅ No critical errors

---

## 📋 **Phase 3: Docker Container Test**

### Step 3.1: Verify Docker Image
```bash
# Check if Docker image exists
docker images | grep imperial-mt5-worker

# If not exists, build it
cd /root/imperial-factory/mt5-master
docker build -t imperial-mt5-worker .
```

### Step 3.2: Test Docker Container with Test Credentials
```bash
# Create test launch.ini for Docker
mkdir -p /tmp/test-docker-config
cat > /tmp/test-docker-config/launch.ini << EOF
[Common]
Login=YOUR_TEST_LOGIN
Password=YOUR_TEST_PASSWORD
Server=YOUR_TEST_SERVER
ProxyEnable=0
CertConfirm=1

[Experts]
AllowLiveTrading=1
AllowDllImport=0
Enabled=1
AccountAndConsole=1
WebRequestEnable=1
WebRequestUrl=https://kmuoqkcxguafxulqlbmi.supabase.co
EOF

# Run Docker container
docker run --rm \
  -v /tmp/test-docker-config/launch.ini:/mt5/config/launch.ini \
  imperial-mt5-worker
```

**Expected Result:**
- ✅ Container starts
- ✅ MT5 launches inside container
- ✅ Auto-login occurs
- ✅ Container runs for ~90 seconds (then stops)

### Step 3.3: Check Container Logs
```bash
# Check Docker logs
docker logs <container-id>

# Or run with interactive mode to see output
docker run -it --rm \
  -v /tmp/test-docker-config/launch.ini:/mt5/config/launch.ini \
  imperial-mt5-worker
```

**What to Look For:**
- ✅ MT5 startup messages
- ✅ Connection established
- ✅ EA loaded (if configured)
- ✅ No critical errors

---

## 📋 **Phase 4: Go Brain Integration Test**

### Step 4.1: Verify Go Brain Service
```bash
# Check Go Brain service status
systemctl status imperial-brain

# Check Go Brain logs
journalctl -u imperial-brain -f

# If not running, start it
systemctl start imperial-brain
```

### Step 4.2: Test Database Connection
```bash
# Check if Go Brain can connect to Supabase
# This should be logged in journalctl
journalctl -u imperial-brain | grep "Database connected"

# Expected: "✅ Database connected" or similar
```

### Step 4.3: Create Test Connection in Database

**Option A: Using Supabase Dashboard**
1. Go to Supabase Dashboard
2. Navigate to `broker_connections` table
3. Insert test row:
   - `user_id`: Your user ID
   - `encrypted_login`: (encrypted test login)
   - `encrypted_password`: (encrypted test password)
   - `encrypted_server`: (encrypted test server)
   - `sync_priority`: 1
   - `connection_status`: 'pending'

**Option B: Using SQL**
```sql
-- Insert test connection
INSERT INTO broker_connections (
  user_id,
  encrypted_login,
  encrypted_password,
  encrypted_server,
  sync_priority,
  connection_status
) VALUES (
  'your-user-id-here',
  'encrypted-login-here',
  'encrypted-password-here',
  'encrypted-server-here',
  1,
  'pending'
);
```

### Step 4.4: Monitor Go Brain Activity
```bash
# Watch Go Brain logs in real-time
journalctl -u imperial-brain -f

# Expected logs when sync_priority = 1:
# - "⚡ INSTANT SYNC TRIGGERED for Connection: <id>"
# - "🚀 Worker Launched for Account <login>"
# - Docker container starts
```

### Step 4.5: Verify Docker Container Launch
```bash
# Check if Docker container was created
docker ps -a | grep worker_

# Check container logs
docker logs <container-id>

# Expected: MT5 starts, connects, EA runs
```

---

## 📋 **Phase 5: Frontend Integration Test**

### Step 5.1: Test Frontend Connection
1. Open frontend application
2. Navigate to Journal XX Pro
3. Click "Connect Broker"
4. Enter test credentials
5. Submit

### Step 5.2: Monitor Backend
```bash
# On VPS, watch Go Brain logs
journalctl -u imperial-brain -f

# Expected:
# - "⚡ INSTANT SYNC TRIGGERED"
# - "🚀 Worker Launched"
# - Container starts
```

### Step 5.3: Check Database Updates
```sql
-- Check broker_connections table
SELECT id, connection_status, is_syncing, last_sync_at, last_error
FROM broker_connections
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 1;

-- Expected:
-- connection_status: 'connecting' → 'connected'
-- is_syncing: true → false
-- last_sync_at: updated timestamp
```

### Step 5.4: Check Trade Data
```sql
-- Check if trades were inserted
SELECT *
FROM trade_journal_entries
WHERE broker_connection_id = 'your-connection-id'
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Trade records with:
-- - asset_ticker
-- - trade_type (Long/Short)
-- - pnl
-- - broker_trade_id
-- - sync_source: 'mt5_docker'
```

---

## 🔍 **Troubleshooting Common Issues**

### Issue 1: MT5 Won't Start
```bash
# Check Wine processes
ps aux | grep wine

# Kill stuck processes
wineserver -k
killall -9 wine64 terminal64.exe Xvfb

# Check MT5 path
ls -lh /root/imperial-factory/mt5-master/terminal64.exe

# Check Wine configuration
winecfg
```

### Issue 2: Connection Failed
- ✅ Verify credentials in launch.ini
- ✅ Check broker server name (case-sensitive)
- ✅ Verify account is active on broker
- ✅ Check MT5 logs for error messages

### Issue 3: Docker Container Fails
```bash
# Check Docker logs
docker logs <container-id>

# Check if entrypoint.sh is executable
ls -lh /root/imperial-factory/mt5-master/entrypoint.sh

# Rebuild Docker image
cd /root/imperial-factory/mt5-master
docker build -t imperial-mt5-worker .
```

### Issue 4: Go Brain Not Starting Containers
```bash
# Check Go Brain logs
journalctl -u imperial-brain -n 100

# Check database connection
# Verify DATABASE_URL in imperial-brain.service

# Restart Go Brain
systemctl restart imperial-brain
```

### Issue 5: No Trades in Database
- ✅ Check MQL5 EA is loaded in MT5
- ✅ Check EA logs in MT5
- ✅ Verify WebRequest URL is allowed in MT5
- ✅ Check mt5-sync Edge Function logs
- ✅ Verify x-ingest-key matches INGEST_SECRET

---

## ✅ **Success Criteria**

### Phase 1 ✅
- [ ] MT5 executable exists
- [ ] Wine installed and working
- [ ] Xvfb installed

### Phase 2 ✅
- [ ] MT5 starts manually
- [ ] Auto-login works
- [ ] Connection established
- [ ] Account info visible

### Phase 3 ✅
- [ ] Docker image builds
- [ ] Container starts
- [ ] MT5 runs in container
- [ ] Auto-login works

### Phase 4 ✅
- [ ] Go Brain service running
- [ ] Database connection works
- [ ] Container launches on sync_priority = 1
- [ ] Container runs successfully

### Phase 5 ✅
- [ ] Frontend connects
- [ ] Go Brain receives trigger
- [ ] Container launches
- [ ] Trades appear in database
- [ ] Frontend shows trades

---

## 🚀 **Next Steps After Testing**

1. **If all phases pass**: ✅ Ready for production!
2. **If Phase 1-2 fail**: Fix MT5 installation/Wine setup
3. **If Phase 3 fails**: Fix Docker configuration
4. **If Phase 4 fails**: Fix Go Brain/Database connection
5. **If Phase 5 fails**: Fix Frontend/Edge Function integration

---

## 📝 **Testing Checklist**

Use this checklist to track your progress:

```
Phase 1: Basic Installation
[ ] MT5 executable exists
[ ] Wine installed
[ ] Xvfb installed

Phase 2: Manual Connection
[ ] launch.ini created
[ ] MT5 starts manually
[ ] Connection established
[ ] Account info visible

Phase 3: Docker Test
[ ] Docker image built
[ ] Container starts
[ ] MT5 runs in container
[ ] Auto-login works

Phase 4: Go Brain Test
[ ] Go Brain service running
[ ] Database connection works
[ ] Container launches on trigger
[ ] Container runs successfully

Phase 5: Frontend Test
[ ] Frontend connects
[ ] Go Brain receives trigger
[ ] Container launches
[ ] Trades in database
[ ] Frontend shows trades
```

---

## 🎯 **Start Here: Phase 1**

**Begin with Phase 1** - SSH into VPS and verify basic installation:

```bash
ssh root@209.222.12.247
ls -lh /root/imperial-factory/mt5-master/terminal64.exe
wine --version
which Xvfb
```

**Then proceed through each phase sequentially!** 🚀
