# 🚀 Execute Deployment on Windows VPS

## ⚡ Quick Start

### Step 1: Connect to Your Windows VPS

Use Remote Desktop or your preferred method to connect to:
- **VPS IP**: `45.32.89.134`
- **OS**: Windows Server

---

### Step 2: Open PowerShell as Administrator

1. **Right-click** on PowerShell icon
2. Select **"Run as Administrator"**
3. Click **"Yes"** when prompted by UAC

---

### Step 3: Run Deployment Script

**Option A: Use the wrapper script** (Recommended)
```powershell
cd C:\vps-broker-service
.\vps-setup\RUN_DEPLOYMENT.ps1
```

**Option B: Run directly**
```powershell
cd C:\vps-broker-service
.\vps-setup\DEPLOY_NOW_SAFE.ps1
```

---

### Step 4: Wait for Completion

The script will:
1. ✅ Verify Price Feeder is running
2. ✅ Install dependencies (if needed)
3. ✅ Build the service
4. ✅ Deploy without stopping Price Feeder
5. ✅ Verify both services are running

**Expected time**: 1-2 minutes

---

### Step 5: Verify Deployment

**Check services**:
```powershell
pm2 list
```

**Expected output**:
```
┌─────┬──────────────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                         │ status  │ restart │ uptime   │
├─────┼──────────────────────────────┼─────────┼─────────┼──────────┤
│ 0   │ Imperial Price Feeder        │ online  │ 0       │ 2h 30m   │
│ 1   │ imperial-trade-broker-service│ online  │ 0       │ 0m 5s    │
└─────┴──────────────────────────────┴─────────┴─────────┴──────────┘
```

**Test health endpoint**:
```powershell
$apiKey = "bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d"
Invoke-WebRequest -Uri "http://localhost:3001/health" -Headers @{"X-API-Key"=$apiKey}
```

**Expected**: `{"status":"ok","service":"imperial-trade-broker-service",...}`

---

## ✅ Success Indicators

After deployment, you should see:

1. **Script Output**:
   ```
   ✅ Price Feeder: PROTECTED AND RUNNING
   ✅ Broker Service: DEPLOYED
   🔒 Price Feeder was never stopped during deployment
   ```

2. **PM2 Status**:
   - Both services show "online"
   - Price Feeder uptime continues (not reset)

3. **Health Endpoint**:
   - Returns 200 status
   - Contains service information

---

## 🐛 Troubleshooting

### Issue: "Script not found"

**Error**: `The term '.\vps-setup\DEPLOY_NOW_SAFE.ps1' is not recognized`

**Fix**:
```powershell
# Check if file exists
Test-Path C:\vps-broker-service\vps-setup\DEPLOY_NOW_SAFE.ps1

# If false, check directory structure
Get-ChildItem C:\vps-broker-service\vps-setup\
```

---

### Issue: "Access Denied"

**Error**: `Access is denied` or `Cannot run script`

**Fix**:
1. Ensure PowerShell is run as Administrator
2. Check execution policy:
   ```powershell
   Get-ExecutionPolicy
   ```
3. If needed, set execution policy:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

---

### Issue: "Build Failed"

**Error**: `npm run build` fails

**Fix**:
```powershell
cd C:\vps-broker-service
npm install
npm run build
```

---

### Issue: "Service Not Starting"

**Error**: Service shows "errored" or "stopped" in PM2

**Fix**:
```powershell
# Check logs
pm2 logs imperial-trade-broker-service --lines 50

# Restart service
pm2 restart imperial-trade-broker-service

# Check for errors
pm2 logs imperial-trade-broker-service --err --lines 50
```

---

## 📋 Post-Deployment Checklist

- [ ] Both services show "online" in PM2
- [ ] Health endpoint returns 200
- [ ] Price Feeder is still running
- [ ] No errors in PM2 logs
- [ ] Service accessible on port 3001

---

## 🧪 Next: Test Frontend Connection

After successful deployment:

1. **On your local machine**, open browser
2. Navigate to: `http://localhost:5173/dashboard/journal-xx-pro`
3. **Connect broker** with credentials:
   - Login: `800107112`
   - Password: `Demo@123`
   - Server: `ECMarketsLtd-Demo`

**See**: `vps-setup/DEPLOY_AND_TEST_NOW.md` for complete testing guide

---

## 📝 Quick Reference

**VPS IP**: `45.32.89.134`
**Service Port**: `3001`
**API Key**: `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

**Deployment Script**: `C:\vps-broker-service\vps-setup\DEPLOY_NOW_SAFE.ps1`
**Wrapper Script**: `C:\vps-broker-service\vps-setup\RUN_DEPLOYMENT.ps1`

---

**Ready to deploy!** 🚀

Run the script on your Windows VPS now!
