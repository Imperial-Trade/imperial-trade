# Root Cause Analysis: Why Live Prices Keep Stopping

## 🔍 Investigation Results

### Problem Identified:
**Price Feeder was in a restart loop (3,723 restarts in a few hours!)**

### Root Causes:

1. **MT5 Keeps Closing**
   - MT5 terminal closes/crashes
   - Price Feeder can't connect without MT5
   - Price Feeder crashes/restarts

2. **Watchdog MT5 Startup Command Failing**
   - The PowerShell command to start MT5 was failing
   - Watchdog kept trying to start MT5 but it failed every time
   - This created an infinite loop

3. **Restart Loop**
   - Watchdog detects MT5 not running → tries to start → fails
   - Price Feeder can't connect → crashes → restarts
   - Watchdog detects Price Feeder down → restarts → fails again (no MT5)
   - **Infinite loop: 3,723 restarts!**

## ✅ Fixes Applied

### 1. Fixed MT5 Startup Command
**Before:**
```javascript
exec(`powershell.exe -Command "Start-Process -FilePath '${mt5Path}' -WindowStyle Normal"`, ...)
```

**After:**
```javascript
// Primary method: Use cmd /c
exec(`cmd /c start "" "${mt5Path}"`, ...)
// Fallback: Try PowerShell alternative
exec(`powershell.exe -Command "& '${mt5Path}'"`, ...)
```

### 2. Increased MT5 Initialization Wait Time
- Changed from 3 seconds to 5 seconds
- Gives MT5 more time to fully initialize before Price Feeder connects

### 3. Fixed Price Update Check
- Updated Supabase query to use proper REST API
- Now correctly checks if prices are updating in database

## 🎯 Current Status

### What Should Happen Now:
1. **MT5 stays open** - Should not close automatically
2. **Watchdog can start MT5** - Fixed startup command works
3. **Price Feeder connects** - Can connect to MT5 when it's running
4. **Prices stream continuously** - No more restart loops

### If Prices Stop Again:
1. Check MT5 is running: `Get-Process terminal64 | Where-Object { $_.Path -like '*MT5_PriceFeeder*' }`
2. Check Price Feeder logs: `pm2 logs "Imperial Price Feeder" --lines 50`
3. Check watchdog logs: `pm2 logs price-feeder-watchdog --lines 50`
4. If MT5 closed, watchdog should now be able to restart it

## 📊 Monitoring

### Check for Restart Loops:
```powershell
pm2 describe "Imperial Price Feeder" | Select-String "restart"
# Should show low restart count (not thousands!)
```

### Check MT5 Status:
```powershell
Get-Process terminal64 | Where-Object { $_.Path -like '*MT5_PriceFeeder*' }
# Should show 1 process running
```

### Check Price Updates:
```sql
SELECT symbol, updated_at, EXTRACT(EPOCH FROM (NOW() - updated_at)) as seconds_ago 
FROM market_prices 
WHERE symbol IN ('XAUUSD', 'BTCUSD') 
ORDER BY updated_at DESC LIMIT 2;
-- Should show prices updated within last few seconds
```

## ⚠️ Important Notes

1. **MT5 Auto-Login Required**
   - MT5 must have password saved to auto-login
   - If MT5 closes, it needs to auto-login when restarted
   - Run: `C:\MT5_PriceFeeder\terminal64.exe` and save password

2. **Watchdog Now Works**
   - Can detect when prices stop updating
   - Can restart MT5 if it closes
   - Can restart Price Feeder if it crashes
   - **But MT5 must stay open for prices to work!**

3. **If MT5 Keeps Closing**
   - Check Windows Event Viewer for MT5 crashes
   - Check if MT5 has enough memory/resources
   - Consider running MT5 as a service or scheduled task

## 🔧 Next Steps if Issue Persists

1. **Investigate why MT5 closes**
   - Check Windows logs
   - Check MT5 logs in `C:\MT5_PriceFeeder\logs`
   - Check if MT5 is running out of memory

2. **Consider MT5 as Service**
   - Run MT5 as a Windows service to prevent it from closing
   - Use NSSM (Non-Sucking Service Manager) to create service

3. **Add MT5 Monitoring**
   - Create separate watchdog for MT5 process
   - Monitor MT5 health independently
