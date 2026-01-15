# 🚀 Complete VPS Deployment Guide

## 📋 Overview

This guide covers the complete deployment of the broker service fixes to your VPS (45.32.89.134).

**Status:**
- ✅ Edge Function deployed (Version 44)
- ⏳ VPS broker service needs deployment
- ⏳ Python scripts need verification/update

---

## 🎯 Step-by-Step Deployment

### **Step 1: Verify Edge Function Secrets (Supabase Dashboard)**

Before deploying, ensure these secrets are configured in Supabase:

1. **Go to:** https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/settings/vault

2. **Verify these secrets exist:**
   - `VPS_MT5_SERVICE_URL` = `http://45.32.89.134:3001`
   - `VPS_API_KEY` = (should match the API key in VPS `.env` file)

3. **If missing, add them:**
   ```bash
   # Via Supabase CLI
   supabase secrets set VPS_MT5_SERVICE_URL="http://45.32.89.134:3001" --project-ref kmuoqkcxguafxulqlbmi
   supabase secrets set VPS_API_KEY="your_vps_api_key_here" --project-ref kmuoqkcxguafxulqlbmi
   ```

---

### **Step 2: SSH to VPS**

**On Mac/Linux:**
```bash
ssh Administrator@45.32.89.134
```

**On Windows (PowerShell):**
```powershell
ssh Administrator@45.32.89.134
```

---

### **Step 3: Check Current Service Status**

**On VPS, run:**
```powershell
# Check PM2 status
pm2 status

# Check if service is running
pm2 logs imperial-trade-broker-service --lines 20

# Check port 3001
netstat -an | Select-String ":3001"

# Test health endpoint
Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
```

---

### **Step 4: Update Python Scripts (If Needed)**

**Option A: Copy from Local Machine (Mac/Linux)**

From your local machine:
```bash
# Navigate to project
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"

# Copy Python scripts to VPS
scp vps-broker-service/python/test_connection.py Administrator@45.32.89.134:"C:/vps-broker-service/python/"
scp vps-broker-service/python/fetch_trades.py Administrator@45.32.89.134:"C:/vps-broker-service/python/"
```

**Option B: Manual Update on VPS**

If the files need manual updates, verify the fixes are applied:

```powershell
# On VPS
cd C:\vps-broker-service\python

# Check test_connection.py has correct timeout
Select-String -Path test_connection.py -Pattern "timeout=20000"

# Check test_connection.py has IPC delay
Select-String -Path test_connection.py -Pattern "time\.sleep\(2\)"

# Check test_connection.py has terminal sync wait
Select-String -Path test_connection.py -Pattern "wait_for_terminal_sync"

# Check fetch_trades.py has IPC delay
Select-String -Path fetch_trades.py -Pattern "time\.sleep\(2\)"
```

**Expected Results:**
- ✅ `timeout=20000` (20 seconds)
- ✅ `time.sleep(2)` (2 second IPC delay)
- ✅ `wait_for_terminal_sync` (terminal sync wait)

---

### **Step 5: Update Broker Service TypeScript Code**

**Option A: Copy from Local Machine (Mac/Linux)**

From your local machine:
```bash
# Copy the updated index.ts to VPS
scp vps-broker-service/src/index.ts Administrator@45.32.89.134:"C:/vps-broker-service/src/"
```

**Option B: Manual Update on VPS**

Verify the timeout fix is applied:

```powershell
# On VPS
cd C:\vps-broker-service\src

# Check if job timeout is 45 seconds
Select-String -Path index.ts -Pattern "45000"  # Should find: 45000 (45 seconds)
```

---

### **Step 6: Build and Restart Broker Service**

**On VPS, run:**
```powershell
# Navigate to service directory
cd C:\vps-broker-service

# Install dependencies (if needed)
npm install

# Build TypeScript
npm run build

# Check build succeeded
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Restart PM2 service
pm2 restart imperial-trade-broker-service

# Check service status
pm2 status

# View logs
pm2 logs imperial-trade-broker-service --lines 50
```

**Or use the automated script:**
```powershell
# If the deployment script exists on VPS
C:\vps-setup\DEPLOY_VPS_BROKER_SERVICE.ps1
```

---

### **Step 7: Verify Service is Running**

**On VPS, run:**
```powershell
# Check service status
pm2 status

# Check health endpoint
Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing

# Check port is listening
netstat -an | Select-String ":3001.*LISTENING"

# Check external access (from your local machine)
curl http://45.32.89.134:3001/health
```

**Expected Output:**
```json
{
  "status": "ok",
  "service": "imperial-trade-broker-service",
  "timestamp": "2025-01-XX...",
  "uptime": 123.45
}
```

---

### **Step 8: Run Complete Connection Chain Verification**

**On VPS, run:**
```powershell
# Run the verification script
C:\vps-setup\VERIFY_COMPLETE_CONNECTION_CHAIN.ps1
```

**Or manually verify:**
```powershell
# 1. Port Configuration
netstat -an | Select-String ":3001.*LISTENING"

# 2. Service Status
pm2 status | Select-String "imperial-trade-broker-service"

# 3. Health Check
Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing

# 4. MT5_BrokerService Configuration
Test-Path "C:\MT5_BrokerService\terminal64.exe"

# 5. Python Scripts Configuration
Select-String -Path "C:\vps-broker-service\python\test_connection.py" -Pattern "C:\\MT5_BrokerService\\terminal64.exe"
Select-String -Path "C:\vps-broker-service\python\test_connection.py" -Pattern "timeout=20000"
```

---

### **Step 9: Test Edge Function Connection**

**From your local machine (or browser console):**
```bash
# Test Edge Function (requires authentication)
curl -X POST "https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/test-broker-connection" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "login": "81071266",
    "password": "YOUR_PASSWORD",
    "server": "ECMarkets-Demo",
    "broker": "EC Markets"
  }' \
  --max-time 60
```

**Or test from frontend:**
1. Open Journal XX Pro in browser
2. Navigate to Broker Connections
3. Add new broker connection
4. Enter credentials (EC Markets/XS/PU Prime)
5. Click "Test Connection"
6. Should complete within 55 seconds ✅

---

## 🔍 Troubleshooting

### Issue: Service won't start after build

**Solution:**
```powershell
# Check build errors
cd C:\vps-broker-service
npm run build

# Check TypeScript errors
npx tsc --noEmit

# Check PM2 logs
pm2 logs imperial-trade-broker-service --err --lines 50

# Try starting manually
node dist/index.js
```

---

### Issue: Python scripts not working

**Solution:**
```powershell
# Verify Python is installed
python --version

# Verify MetaTrader5 package is installed
python -c "import MetaTrader5 as mt5; print(mt5.__version__)"

# Test connection script manually
cd C:\vps-broker-service\python
python test_connection.py '{"login": "81071266", "password": "test", "server": "ECMarkets-Demo"}'
```

---

### Issue: Edge Function still timing out

**Check:**
1. VPS service is running: `pm2 status`
2. Port 3001 is listening: `netstat -an | Select-String ":3001"`
3. Firewall allows port 3001
4. Secrets are configured in Supabase Dashboard
5. VPS_API_KEY matches between Supabase and VPS `.env`

**Verify Secrets:**
```bash
# Check Edge Function logs in Supabase Dashboard
# Should see: "✅ Testing connection via VPS: http://45.32.89.134:3001"
```

---

### Issue: Connection works locally but not from Edge Function

**Check:**
1. VPS firewall allows external connections on port 3001
2. VPS security group (Vultr/AWS) allows port 3001 from internet
3. Service is bound to `0.0.0.0:3001`, not `127.0.0.1:3001`

**Fix:**
```powershell
# Check service binding in index.ts
Select-String -Path "C:\vps-broker-service\src\index.ts" -Pattern "listen.*0\.0\.0\.0"

# Should see: app.listen(PORT, '0.0.0.0', ...)
```

---

## ✅ Deployment Checklist

- [ ] Edge Function secrets verified in Supabase Dashboard
- [ ] Python scripts copied/updated on VPS
- [ ] Broker service TypeScript code updated
- [ ] Service built successfully (`npm run build`)
- [ ] Service restarted in PM2 (`pm2 restart`)
- [ ] Service status is ONLINE (`pm2 status`)
- [ ] Health endpoint returns 200 OK
- [ ] Port 3001 is listening externally
- [ ] Connection chain verification passed
- [ ] Edge Function test connection works

---

## 📊 Expected Results

After successful deployment:

1. **Edge Function Logs:**
   ```
   ✅ Testing connection via VPS: http://45.32.89.134:3001
   ✅ VPS response received
   ✅ Connection verified
   ```

2. **VPS Service Logs:**
   ```
   ✅ Connection test job completed
   ✅ MT5 connection successful
   ```

3. **Frontend:**
   - Broker connection test completes within 55 seconds
   - Success message displayed
   - Account info retrieved correctly

---

**Last Updated:** Just now  
**Status:** Ready for VPS deployment ⏳
