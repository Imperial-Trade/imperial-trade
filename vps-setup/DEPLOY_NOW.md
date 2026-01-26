# 🚀 Deploy Now - Price Feeder Protected

## Quick Deploy (Copy & Paste on VPS)

**On your Windows VPS, open PowerShell as Administrator and run:**

```powershell
cd C:\vps-broker-service
.\vps-setup\DEPLOY_NOW_SAFE.ps1
```

**That's it!** The script protects the Price Feeder automatically.

---

## What Happens

1. ✅ **Verifies Price Feeder is running** (starts it if needed)
2. ✅ **Builds broker service** (npm install + npm run build)
3. ✅ **Restarts ONLY broker service** (Price Feeder untouched)
4. ✅ **Verifies Price Feeder still running** (auto-restarts if stopped)
5. ✅ **Saves PM2 config** (services persist after reboot)

---

## Manual Deploy (If Script Fails)

If you prefer to deploy manually:

```powershell
# 1. Verify Price Feeder is running
pm2 list | Select-String "Imperial Price Feeder"

# 2. Navigate to broker service
cd C:\vps-broker-service

# 3. Install dependencies
npm install

# 4. Build service
npm run build

# 5. Restart ONLY broker service (NOT Price Feeder)
pm2 restart imperial-trade-broker-service

# OR if it doesn't exist:
pm2 start dist\index.js --name imperial-trade-broker-service

# 6. Verify Price Feeder is still running
pm2 list | Select-String "Imperial Price Feeder"

# 7. Save PM2 config
pm2 save
```

---

## Verify Deployment

```powershell
# Check both services
pm2 list

# Test broker service
$apiKey = "bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d"
Invoke-WebRequest -Uri "http://localhost:3001/health" -Headers @{"X-API-Key"=$apiKey}
```

**Expected**: Both services show "online" ✅

---

## 🔒 Price Feeder Protection

**The deployment script:**
- ✅ **NEVER** runs `pm2 delete all` or `pm2 stop all`
- ✅ **ONLY** restarts the broker service
- ✅ **VERIFIES** Price Feeder after deployment
- ✅ **AUTO-RESTARTS** Price Feeder if it stops

**Your Price Feeder is safe!** 🔒

---

## ✅ Success Checklist

After deployment:
- [ ] Price Feeder: Still running (was never stopped)
- [ ] Broker Service: Running
- [ ] Health endpoint: Returns 200
- [ ] PM2 list: Both show "online"

---

**Ready to deploy!** Run the script on your VPS now.
