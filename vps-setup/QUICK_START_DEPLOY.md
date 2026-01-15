# 🚀 Quick Start - Deploy and Test

## ⚡ Fast Track (5 Minutes)

### On Windows VPS:

```powershell
# 1. Deploy service (protects Price Feeder)
cd C:\vps-broker-service
.\vps-setup\DEPLOY_NOW_SAFE.ps1

# 2. Verify it's running
pm2 list

# 3. Test health endpoint
$apiKey = "bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d"
Invoke-WebRequest -Uri "http://localhost:3001/health" -Headers @{"X-API-Key"=$apiKey}
```

### On Your Local Machine:

```bash
# 1. Start frontend
npm run dev

# 2. Open browser
# Navigate to: http://localhost:5173/dashboard/journal-xx-pro

# 3. Connect broker
# - Select "EC Markets"
# - Login: 800107112
# - Password: Demo@123
# - Server: ECMarketsLtd-Demo
# - Click "Connect Broker"
```

**That's it!** 🎉

---

## ✅ Verification

**After deployment, check**:
- [ ] `pm2 list` shows both services online
- [ ] Health endpoint returns 200
- [ ] Frontend can connect
- [ ] Connection test succeeds
- [ ] Trades appear in journal

---

## 🐛 If Something Fails

**Check logs**:
- Browser Console (F12)
- Edge Function Logs (Supabase Dashboard)
- VPS Service Logs (`pm2 logs imperial-trade-broker-service`)

**See**: `vps-setup/DEBUG_CONNECTION_ISSUES.md` for detailed debugging

---

**Ready to go!** 🚀
