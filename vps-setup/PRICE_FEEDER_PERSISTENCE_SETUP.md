# 🔒 Imperial Price Feeder - Always Running Configuration

## ✅ Current Configuration

### PM2 Auto-Restart Settings
- **Max Restarts**: 999,999 (unlimited)
- **Min Uptime**: 1000ms (1 second)
- **Exponential Backoff**: 100ms
- **Auto-Start on Boot**: Configured via `pm2 startup`
- **PM2 Save**: Enabled (persists across reboots)

---

## 🛡️ Protection Mechanisms

### 1. **PM2 Auto-Restart** ✅
- Automatically restarts if the process crashes
- Unlimited restart attempts
- Exponential backoff to prevent restart loops

### 2. **PM2 Startup on Boot** ✅
- Automatically starts when Windows boots
- Persists across system restarts
- No manual intervention required

### 3. **PM2 Save** ✅
- Saves current process list
- Restores processes after PM2 restart
- Persists configuration changes

### 4. **Health Monitoring** ✅
- PM2 monitors process health
- Auto-restarts on failure
- Logs all restart events

---

## 📋 Setup Commands

### Initial Setup (One-Time)
```powershell
# 1. Start Price Feeder
pm2 start C:\imperial-price-feeder\dist\index.js --name "Imperial Price Feeder"

# 2. Configure auto-restart
pm2 set "Imperial Price Feeder" max_restarts 999999
pm2 set "Imperial Price Feeder" min_uptime 1000
pm2 set "Imperial Price Feeder" exp_backoff_restart_delay 100

# 3. Save PM2 configuration
pm2 save

# 4. Configure startup on boot
pm2 startup
# Run the command shown in the output as Administrator
```

### Verify Configuration
```powershell
# Check PM2 status
pm2 status

# Check Price Feeder details
pm2 describe "Imperial Price Feeder"

# Check logs
pm2 logs "Imperial Price Feeder" --lines 20
```

---

## 🔧 Maintenance Commands

### Check Status
```powershell
pm2 status
```

### Restart Price Feeder (if needed)
```powershell
pm2 restart "Imperial Price Feeder"
pm2 save
```

### View Logs
```powershell
# Standard logs
pm2 logs "Imperial Price Feeder" --lines 50

# Error logs only
pm2 logs "Imperial Price Feeder" --err --lines 50

# Real-time logs
pm2 logs "Imperial Price Feeder" --lines 0
```

### Monitor Resources
```powershell
pm2 monit
```

---

## 🚨 Troubleshooting

### Issue: Price Feeder Keeps Restarting

**Check logs:**
```powershell
pm2 logs "Imperial Price Feeder" --err --lines 50
```

**Common causes:**
1. MT5 not logged in → Log in to EC Markets MT5 manually
2. Python script error → Check Python and MetaTrader5 package
3. Network timeout → Check internet connection
4. Configuration error → Check `.env` file

### Issue: Price Feeder Not Starting on Boot

**Solution:**
```powershell
# Reconfigure startup
pm2 startup
# Run the command shown as Administrator
pm2 save
```

### Issue: PM2 Not Persisting

**Solution:**
```powershell
# Save current state
pm2 save

# Verify save file exists
Test-Path "$env:USERPROFILE\.pm2\dump.pm2"
```

---

## 📊 Monitoring

### Check Uptime
```powershell
pm2 describe "Imperial Price Feeder" | Select-String "uptime"
```

### Check Restart Count
```powershell
pm2 describe "Imperial Price Feeder" | Select-String "restarts"
```

### Check Process Health
```powershell
pm2 jlist | ConvertFrom-Json | Where-Object { $_.name -eq "Imperial Price Feeder" } | Select-Object name, pm2_env.status, pm2_env.restart_time
```

---

## 🔄 Scheduled Health Check

Create a scheduled task to run the health check script:

**Task Scheduler Settings:**
- **Trigger**: Every 5 minutes
- **Action**: Run PowerShell script
- **Script**: `C:\vps-broker-service\vps-setup\ENSURE_PRICE_FEEDER_ALWAYS_RUNNING.ps1`

**PowerShell Command:**
```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\vps-broker-service\vps-setup\ENSURE_PRICE_FEEDER_ALWAYS_RUNNING.ps1"
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] PM2 status shows Price Feeder as "online"
- [ ] `pm2 describe` shows max_restarts = 999999
- [ ] `pm2 startup` shows startup is configured
- [ ] `pm2 save` was executed successfully
- [ ] Price Feeder logs show "MT5 connected"
- [ ] No errors in error logs
- [ ] Process persists after PM2 restart
- [ ] Process starts after Windows reboot (test)

---

## 🎯 Expected Behavior

### Normal Operation
- Price Feeder runs continuously
- PM2 monitors the process
- Logs show price updates
- No manual intervention needed

### After Crash
- PM2 automatically restarts within 1 second
- Exponential backoff prevents restart loops
- Logs show restart events
- Process resumes normal operation

### After Reboot
- PM2 starts automatically
- Price Feeder starts automatically
- MT5 connection re-established
- Price streaming resumes

---

## 📋 Configuration Files

### PM2 Configuration
- **Location**: `C:\Users\Administrator\.pm2\dump.pm2`
- **Contains**: Process list and configuration
- **Updated**: Automatically on `pm2 save`

### Startup Script
- **Location**: `C:\vps-broker-service\vps-setup\ENSURE_PRICE_FEEDER_ALWAYS_RUNNING.ps1`
- **Purpose**: Health check and auto-start
- **Run**: Manually or via scheduled task

---

## 🚨 Important Notes

1. **MT5 Must Stay Open**: Price Feeder requires EC Markets MT5 to be open and logged in
2. **No Manual Restart Needed**: PM2 handles all restarts automatically
3. **Logs Are Critical**: Check logs if issues occur
4. **Startup Configuration**: Must be run as Administrator
5. **Persistent Across Reboots**: Configuration survives system restarts

---

**Last Updated**: 2026-01-09 02:55 UTC
**Status**: ✅ **CONFIGURED FOR ALWAYS RUNNING**
