# 🚀 Deploy Broker Service - Price Feeder Protected

## Quick Deploy (On Windows VPS)

### Step 1: Open PowerShell as Administrator

Right-click PowerShell → "Run as Administrator"

### Step 2: Navigate to Project Directory

```powershell
cd C:\vps-broker-service
```

### Step 3: Run Safe Deployment Script

```powershell
.\vps-setup\DEPLOY_NOW_SAFE.ps1
```

**That's it!** The script will:
- ✅ Verify Price Feeder is running
- ✅ Build broker service
- ✅ Deploy broker service
- ✅ **NEVER stop Price Feeder**
- ✅ Verify both services are running

---

## What the Script Does

1. **Verifies Price Feeder** - Checks if it's running before doing anything
2. **Installs Dependencies** - Runs `npm install` if needed
3. **Builds Service** - Compiles TypeScript to JavaScript
4. **Restarts ONLY Broker Service** - Price Feeder is untouched
5. **Verifies Price Feeder** - Confirms it's still running after deployment
6. **Saves PM2 Config** - Ensures services persist after reboot

---

## Verification

After deployment, verify both services:

```powershell
pm2 list
```

**Expected Output**:
```
┌─────┬──────────────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                         │ status  │ restart │ uptime   │
├─────┼──────────────────────────────┼─────────┼─────────┼──────────┤
│ 0   │ Imperial Price Feeder        │ online  │ 0       │ 2h 30m   │
│ 1   │ imperial-trade-broker-service│ online  │ 0       │ 0m 5s    │
└─────┴──────────────────────────────┴─────────┴─────────┴──────────┘
```

**Both should be "online"** ✅

---

## Test Broker Service

```powershell
$apiKey = "bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d"
Invoke-WebRequest -Uri "http://localhost:3001/health" -Headers @{"X-API-Key"=$apiKey}
```

**Expected**: `{"status":"ok","service":"imperial-trade-broker-service",...}`

---

## 🔒 Price Feeder Protection

**Guarantees**:
- ✅ Price Feeder is **NEVER** stopped during deployment
- ✅ Price Feeder is automatically restarted if it stops
- ✅ Live price feeds continue uninterrupted
- ✅ Only broker service is restarted

**Verification**:
```powershell
# Before deployment
pm2 list | Select-String "Imperial Price Feeder"

# After deployment
pm2 list | Select-String "Imperial Price Feeder"

# Both should show "online"
```

---

## 🐛 Troubleshooting

### Issue: "Price Feeder stopped"

**Solution**:
```powershell
pm2 restart "Imperial Price Feeder"
pm2 list
```

### Issue: "Build failed"

**Solution**:
```powershell
cd C:\vps-broker-service
npm install
npm run build
```

### Issue: "Service not starting"

**Check logs**:
```powershell
pm2 logs imperial-trade-broker-service --lines 50
```

---

## ✅ Success Criteria

- [ ] Price Feeder is running (was never stopped)
- [ ] Broker service is running
- [ ] Health endpoint returns 200
- [ ] Both services show "online" in PM2

---

**Ready to deploy!** Run `DEPLOY_NOW_SAFE.ps1` on your VPS.
