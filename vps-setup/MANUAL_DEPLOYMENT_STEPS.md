# 🔧 Manual Deployment Steps - Execute on VPS

## ✅ **Secrets Configured in Supabase**

Both secrets have been successfully configured:
- ✅ `VPS_MT5_SERVICE_URL` = `http://45.32.89.134:3001`
- ✅ `VPS_API_KEY` = `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

---

## 🚀 **Deployment Steps - Execute on VPS**

### **Step 1: SSH to VPS**

```bash
ssh Administrator@45.32.89.134
```

---

### **Step 2: Navigate to Service Directory**

```powershell
cd C:\vps-broker-service
```

---

### **Step 3: Verify Python Scripts (Check Current Timeout Settings)**

```powershell
# Check test_connection.py timeout
Select-String -Path "python\test_connection.py" -Pattern "timeout="

# Check test_connection.py IPC delay
Select-String -Path "python\test_connection.py" -Pattern "time\.sleep\(2\)"

# Check test_connection.py terminal sync
Select-String -Path "python\test_connection.py" -Pattern "wait_for_terminal_sync"

# Check fetch_trades.py IPC delay
Select-String -Path "python\fetch_trades.py" -Pattern "time\.sleep\(2\)"
```

**Expected Results:**
- ✅ `timeout=20000` (20 seconds, not 25000)
- ✅ `time.sleep(2)` (2 seconds, not 1)
- ✅ `wait_for_terminal_sync` present

**If not correct, you'll need to update them manually or copy from local machine.**

---

### **Step 4: Verify Broker Service TypeScript Code**

```powershell
# Check if job timeout is 45 seconds (45000ms)
Select-String -Path "src\index.ts" -Pattern "45000"
```

**Expected:** Should find `45000` (45 seconds timeout)

**If not found, you'll need to update it manually.**

---

### **Step 5: Build TypeScript**

```powershell
# Install dependencies (if needed)
npm install

# Build TypeScript
npm run build

# Check if build succeeded
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed - check errors above" -ForegroundColor Red
    exit 1
}
```

---

### **Step 6: Restart PM2 Service**

```powershell
# Check current status
pm2 status

# Restart the service
pm2 restart imperial-trade-broker-service

# Wait a few seconds for service to start
Start-Sleep -Seconds 3

# Check status again
pm2 status

# View logs
pm2 logs imperial-trade-broker-service --lines 50
```

---

### **Step 7: Verify Service is Running**

```powershell
# Test health endpoint
Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing

# Check port is listening
netstat -an | Select-String ":3001.*LISTENING"

# Check service status
pm2 status | Select-String "imperial-trade-broker-service"
```

**Expected Output:**
- ✅ Health endpoint returns 200 OK with JSON
- ✅ Port 3001 is LISTENING on 0.0.0.0:3001
- ✅ Service status shows "online"

---

### **Step 8: Verify External Access**

**From your local machine, test:**
```bash
curl http://45.32.89.134:3001/health
```

**Expected:** JSON response with `"status": "ok"`

---

### **Step 9: Run Complete Connection Chain Verification**

**On VPS, if the verification script exists:**
```powershell
C:\vps-setup\VERIFY_COMPLETE_CONNECTION_CHAIN.ps1
```

**Or verify manually:**
```powershell
# 1. Port Configuration
netstat -an | Select-String ":3001.*LISTENING"

# 2. Service Status
$service = pm2 jlist | ConvertFrom-Json | Where-Object { $_.name -eq "imperial-trade-broker-service" }
Write-Host "Service Status: $($service.pm2_env.status)"

# 3. Health Check
$health = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
Write-Host "Health Status: $($health.StatusCode)"

# 4. MT5_BrokerService Configuration
$mt5Path = "C:\MT5_BrokerService\terminal64.exe"
if (Test-Path $mt5Path) {
    Write-Host "✅ MT5_BrokerService exists: $mt5Path"
} else {
    Write-Host "❌ MT5_BrokerService NOT FOUND: $mt5Path"
}

# 5. Python Scripts Configuration
$testConn = "C:\vps-broker-service\python\test_connection.py"
if (Test-Path $testConn) {
    $content = Get-Content $testConn -Raw
    if ($content -match "C:\\MT5_BrokerService\\terminal64.exe" -and $content -match "timeout=20000") {
        Write-Host "✅ test_connection.py: Correctly configured"
    } else {
        Write-Host "⚠️  test_connection.py: May need updates"
    }
} else {
    Write-Host "❌ test_connection.py NOT FOUND"
}
```

---

## 📋 **If Files Need to be Updated**

### **Option A: Copy from Local Machine (Manual SCP)**

**On your LOCAL machine (Mac), run:**
```bash
# Navigate to project
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"

# Copy Python scripts (you'll be prompted for password)
scp vps-broker-service/python/test_connection.py Administrator@45.32.89.134:"C:/vps-broker-service/python/"
scp vps-broker-service/python/fetch_trades.py Administrator@45.32.89.134:"C:/vps-broker-service/python/"

# Copy TypeScript source
scp vps-broker-service/src/index.ts Administrator@45.32.89.134:"C:/vps-broker-service/src/"
```

### **Option B: Edit Files Directly on VPS**

If files need updates, edit them directly on VPS using the fixes documented in:
- `vps-setup/IMPLEMENTATION_COMPLETE.md`

---

## ✅ **Deployment Checklist**

- [x] Secrets configured in Supabase
- [ ] Python scripts verified/updated on VPS
- [ ] TypeScript source verified/updated on VPS
- [ ] Service built successfully (`npm run build`)
- [ ] Service restarted (`pm2 restart`)
- [ ] Health endpoint returns 200 OK
- [ ] Port 3001 listening externally
- [ ] Connection chain verification passed

---

## 🧪 **Testing After Deployment**

### **Test 1: Edge Function Connection (From Frontend)**

1. Open Journal XX Pro in browser
2. Navigate to Broker Connections
3. Add new broker connection
4. Enter credentials (EC Markets/XS/PU Prime)
5. Click "Test Connection"
6. Should complete within **55 seconds** ✅

### **Test 2: Check Logs**

**Edge Function Logs:**
- Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions/test-broker-connection/logs
- Look for: `✅ Testing connection via VPS: http://45.32.89.134:3001`

**VPS Service Logs:**
```powershell
pm2 logs imperial-trade-broker-service --lines 100
```

---

## 🔍 **Troubleshooting**

### Issue: Build fails

```powershell
# Check TypeScript errors
npx tsc --noEmit

# Check for missing dependencies
npm install
```

### Issue: Service won't start

```powershell
# Check PM2 logs for errors
pm2 logs imperial-trade-broker-service --err --lines 50

# Try starting manually to see errors
node dist/index.js
```

### Issue: Health endpoint not responding

```powershell
# Check if service is running
pm2 status

# Check if port is listening
netstat -an | Select-String ":3001"

# Check firewall
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*3001*" }
```

---

**Ready to deploy!** Follow the steps above on your VPS. 🚀
