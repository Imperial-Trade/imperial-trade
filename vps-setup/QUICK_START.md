# 🚀 Quick Start - Deploy Your MT5 Broker Service

## ⚡ One-Command Deployment

```powershell
# On VPS (as Administrator)
cd C:\vps-broker-service
.\vps-setup\DEPLOY_TO_VPS.ps1
```

**That's it!** The script handles everything automatically.

---

## ✅ What Happens During Deployment

1. ✅ Verifies Price Feeder is running (never stops it)
2. ✅ Builds TypeScript code (`npm run build`)
3. ✅ Validates .env configuration (no quotes/spaces)
4. ✅ Creates portable terminal directories (1-50)
5. ✅ Restarts broker service safely (`pm2 restart`)
6. ✅ Verifies both services are running
7. ✅ Shows recent logs

**Total Time**: ~2-3 minutes

---

## 🧪 Verify Deployment Success

### Check Service Status

```powershell
pm2 status
```

**Expected Output**:
```
imperial-trade-broker-service  online
Imperial Price Feeder          online
```

### Check Logs

```powershell
pm2 logs imperial-trade-broker-service --lines 50
```

**Look for**:
- ✅ `✅ API Key validated successfully`
- ✅ `✅ Service started successfully`
- ✅ No errors or crashes

### Test Connection

From browser console or Edge Function test script:
```javascript
// Use your test script
// Should see in PM2 logs:
✅ MT5 connection successful
```

---

## 🎯 Post-Deployment Tasks

### 1. Configure Firewall (Recommended)

```powershell
# As Administrator
.\vps-setup\CONFIGURE_FIREWALL.ps1
```

This restricts port 3001 to Supabase IP ranges only.

### 2. Verify Portable Directories

```powershell
.\vps-setup\verify-portable-directories.ps1
```

This confirms terminal directories are created correctly.

### 3. Set Up Monitoring

```powershell
# Real-time monitoring
pm2 monit

# Watch logs in real-time
pm2 logs imperial-trade-broker-service --raw
```

### 4. Test RDP Disconnect (Optional)

Before closing RDP, run:
```powershell
.\vps-setup\disconnect-rdp-safely.ps1
```

This keeps MT5 GUI alive when you disconnect.

---

## 🚨 Troubleshooting

### Service Won't Start

**Check**:
1. `.env` file exists and format is correct (no quotes/spaces)
2. All required environment variables are set
3. TypeScript compiled successfully
4. Port 3001 is not in use

**Fix**:
```powershell
cd C:\vps-broker-service
npm run build
pm2 delete imperial-trade-broker-service
pm2 start dist\index.js --name imperial-trade-broker-service
pm2 save
```

### "Invalid API key" Error

**Check**:
1. `VPS_API_KEY` in `.env` matches Edge Function secret
2. No quotes/spaces in `.env` value
3. Edge Function sends `X-API-Key` header

**Fix**:
- Verify `.env` format: `VPS_API_KEY=value` (no quotes)
- Check Edge Function secrets in Supabase Dashboard
- Check PM2 logs for detailed error

### Terminal Not Released

**Check**:
1. `finally` block is executing
2. No uncaught exceptions
3. Terminal manager is initialized

**Fix**:
- Check PM2 logs for errors
- Restart service if terminals are stuck
- Verify `terminalManager.releaseTerminal()` is called

---

## 📊 Monitoring Commands

### Real-Time Monitoring
```powershell
pm2 monit
```

### Check Logs
```powershell
pm2 logs imperial-trade-broker-service --lines 100
```

### Check Service Status
```powershell
pm2 status
```

### Check Terminal Stats
```powershell
curl http://localhost:3001/terminals/stats -H "X-API-Key: YOUR_KEY"
```

### Check Health
```powershell
curl http://localhost:3001/health
```

---

## ✅ Success Criteria

You'll know deployment is successful when:

1. ✅ Both services running (`pm2 status`)
2. ✅ Connection test succeeds from browser console
3. ✅ Logs show `✅ MT5 connection successful`
4. ✅ Terminal directories created (verify-portable-directories.ps1)
5. ✅ No errors in PM2 logs
6. ✅ Memory usage within limits (`pm2 monit`)

---

## 🎉 You're Ready!

**Your enterprise-grade MT5 broker service is deployed and ready for production!** 🚀

**Next Step**: Test connection from browser console and verify logs show success.

**Welcome to high-scale algorithmic trading infrastructure!** 🚀📈🎉
