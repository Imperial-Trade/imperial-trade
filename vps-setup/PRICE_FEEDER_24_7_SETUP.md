# Price Feeder 24/7 Setup - Complete Configuration

## ✅ What's Configured

### 1. **Watchdog (Fast Restart)**
- **Check Interval**: 10 seconds (checks every 10s)
- **Restart Threshold**: 1 failure (restarts immediately)
- **Recovery Time**: 5 seconds after restart
- **Status**: Running in PM2

### 2. **PM2 Auto-Restart**
- **Price Feeder**: Auto-restart enabled
- **Watchdog**: Auto-restart enabled
- **Persistence**: Saved to PM2 (`pm2 save`)

### 3. **MT5 Auto-Login**
- **Account**: 81071266 configured
- **Action Required**: Log in once manually and check "Save password"
- **After Setup**: MT5 will auto-login on restart

## 🚀 How It Works

### Fast Recovery Chain:
1. **Price Feeder stops** → Watchdog detects within 10 seconds
2. **Watchdog restarts** → PM2 restarts Price Feeder immediately
3. **MT5 auto-logins** → If MT5 closed, it reopens and logs in automatically
4. **Price Feeder reconnects** → Connects to MT5 and resumes streaming

### Total Recovery Time: ~15-20 seconds maximum

## 📋 Manual Steps Required

### Step 1: Enable MT5 Auto-Login
1. Open EC Markets MT5: `C:\MT5_PriceFeeder\terminal64.exe`
2. Log in with account **81071266**
3. **IMPORTANT**: Check "Save password" or "Remember password" checkbox
4. Close and reopen MT5 to verify it auto-logs in

### Step 2: Verify Watchdog is Running
```powershell
pm2 status
# Should show: price-feeder-watchdog (online)
```

### Step 3: Test Fast Restart
```powershell
# Stop Price Feeder manually
pm2 stop "Imperial Price Feeder"

# Watchdog should restart it within 10-15 seconds
pm2 logs price-feeder-watchdog --lines 20
```

## 🔍 Monitoring

### Check Watchdog Logs:
```powershell
pm2 logs price-feeder-watchdog --lines 50
```

### Check Price Feeder Status:
```powershell
pm2 status
pm2 logs "Imperial Price Feeder" --lines 30
```

### Verify Prices Are Streaming:
- Check website Pattern Stream page
- Prices should update every 1 second
- No gaps or delays

## ⚙️ Configuration Details

### Watchdog Settings:
- **Check Interval**: 10 seconds (was 30s - optimized for fast restart)
- **Max Failures**: 1 (was 3 - restarts immediately)
- **Recovery Wait**: 5 seconds (was 10s - faster recovery)

### PM2 Settings:
- **Auto-restart**: Enabled for both services
- **Persistence**: Saved (survives reboot)
- **Startup**: Configured via `pm2 startup`

## 🎯 Success Criteria

✅ Watchdog is running in PM2
✅ Price Feeder is online
✅ MT5 auto-login is configured
✅ Prices streaming on website
✅ Fast restart tested (< 20 seconds)
