# 🚀 EXECUTE PM2 COMMANDS NOW

## ⚡ Quick Execution on VPS

### Step 1: Connect to VPS
- Go to: https://my.vultr.com → View Console
- OR RDP: `45.32.89.134:3389`
- Username: `Administrator`
- Password: `2#bWj}tv=}5d}u5}`

### Step 2: Open PowerShell as Administrator

### Step 3: Copy and Run Script

**Option A: Copy Entire Script**

1. Open: `vps-setup/RUN_PM2_COMMANDS.ps1`
2. Copy ALL content (Ctrl+A, Ctrl+C)
3. Paste into PowerShell on VPS (Right-click → Paste or Ctrl+V)
4. Press Enter

**Option B: Run Commands Manually**

Copy and paste these commands one by one:

```powershell
# Check PM2 is installed
pm2 --version

# Check all PM2 services
pm2 list

# Check Price Feeder status
pm2 jlist | ConvertFrom-Json | Where-Object { $_.name -eq "Imperial Price Feeder" }

# Restart Price Feeder
pm2 restart "Imperial Price Feeder"

# Check EC Markets MT5
Get-Process -Name terminal64 | Where-Object { $_.Path -like "*EC Markets*" }

# Start MT5 if not running
Start-Process "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"

# Save PM2 configuration
pm2 save

# Check logs
pm2 logs "Imperial Price Feeder" --lines 50
```

---

## ✅ Expected Results

After running the script, you should see:

```
✅ PM2 installed: v5.x.x
✅ Price Feeder FOUND in PM2
✅ EC Markets MT5 is RUNNING
✅ Price Feeder restarted
✅ Watchdogs started
✅ PM2 configuration saved
```

---

## 📊 Verify It's Working

### Check PM2 Status
```powershell
pm2 list
```

Should show:
```
┌─────┬──────────────────────────┬─────────┬─────────┬───────────┐
│ id  │ name                     │ status  │ restart │ uptime    │
├─────┼──────────────────────────┼─────────┼─────────┼───────────┤
│ 0   │ Imperial Price Feeder    │ online  │ 0       │ 1m        │
└─────┴──────────────────────────┴─────────┴─────────┴───────────┘
```

### Check Logs
```powershell
pm2 logs "Imperial Price Feeder" --lines 50
```

Should show successful price sends.

### Verify Prices in Supabase

Run in Supabase SQL Editor:
```sql
SELECT symbol, mid, updated_at, 
EXTRACT(EPOCH FROM (NOW() - updated_at)) as seconds_ago
FROM market_prices 
ORDER BY updated_at DESC 
LIMIT 5;
```

Should show `seconds_ago < 5` (prices updated within last 5 seconds)

---

## 🎯 Ready to Execute

**Open `RUN_PM2_COMMANDS.ps1` and copy it to VPS PowerShell!** 🚀




