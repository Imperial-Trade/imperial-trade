# VPS Setup Scripts - Complete Trading App Infrastructure

## 🎯 Overview

This directory contains scripts to set up your VPS with all required runtime environments, process managers, and ensure the live price system **NEVER dies**.

## 📋 VPS Details

- **IP Address**: `45.32.89.134`
- **Username**: `Administrator`
- **Password**: `2#bWj}tv=}5d}u5}`
- **SSH Key**: `MacBook-VPS-Key` (vultr-vps)

## 🚀 Quick Start

### Option 1: Vultr Web Console (Easiest)

1. Go to: https://my.vultr.com
2. Login and select your VPS instance
3. Click **"View Console"** (browser-based RDP)
4. Once connected, copy the scripts below to PowerShell

### Option 2: RDP Client

1. Connect to: `45.32.89.134:3389`
2. Username: `Administrator`
3. Password: `2#bWj}tv=}5d}u5}`
4. Open PowerShell as Administrator

---

## 📝 Setup Steps

### Step 1: Complete VPS Setup

**Run this FIRST** to install all runtime environments:

```powershell
# Copy COMPLETE_VPS_SETUP.ps1 content and run in PowerShell (as Administrator)
```

This script installs:
- ✅ Chocolatey (Windows Package Manager)
- ✅ Node.js LTS + npm
- ✅ Python 3 + pip + MetaTrader5 package
- ✅ Deno runtime
- ✅ PM2 Process Manager
- ✅ Git
- ✅ Watchdog scripts for auto-restart
- ✅ PM2 configuration files

**Time**: ~10-15 minutes

---

### Step 2: Start All Services

**After Step 1 completes**, run:

```powershell
# Copy START_ALL_SERVICES.ps1 content and run in PowerShell (as Administrator)
```

This script:
- ✅ Ensures EC Markets MT5 is running
- ✅ Starts MT5 Watchdog (ensures MT5 never closes)
- ✅ Starts Price Feeder service
- ✅ Starts Price Feeder Watchdog (ensures service never dies)
- ✅ Saves PM2 configuration (auto-start on boot)

**Time**: ~1 minute

---

### Step 3: Verify Everything

**After Step 2**, verify all services:

```powershell
# Copy VERIFY_EVERYTHING.ps1 content and run in PowerShell
```

This checks:
- ✅ All runtime environments installed
- ✅ MT5 installation and process
- ✅ PM2 services running
- ✅ Price Feeder configuration
- ✅ Network connectivity to Supabase

---

## 🔄 Daily Operations

### Check Service Status

```powershell
pm2 list
```

### View Logs

```powershell
# Price Feeder logs
pm2 logs "Imperial Price Feeder" --lines 50

# Watchdog logs
pm2 logs "Price Feeder Watchdog" --lines 50
pm2 logs "MT5 Watchdog" --lines 50

# All logs
pm2 logs --lines 50
```

### Restart Services (if needed)

```powershell
pm2 restart "Imperial Price Feeder"
pm2 restart "Price Feeder Watchdog"
pm2 restart "MT5 Watchdog"
pm2 save
```

### Monitor Resources

```powershell
pm2 monit
```

---

## 🛡️ Never-Ending Guarantee

The system uses **multiple layers** to ensure services never die:

1. **PM2 Auto-Restart**: Each service has `autorestart: true` with unlimited restarts
2. **Price Feeder Watchdog**: Monitors price feeder service every 10 seconds
3. **MT5 Watchdog**: Monitors MT5 process every 15 seconds
4. **Windows Startup**: PM2 configured to auto-start on boot

### What Happens if a Service Dies?

1. **PM2** automatically restarts it (within 5-10 seconds)
2. **Watchdog** detects if PM2 fails and restarts it (within 10-15 seconds)
3. **MT5 Watchdog** ensures MT5 is always running

**Result**: Maximum downtime is ~15 seconds, services will always recover!

---

## 🚨 Troubleshooting

### Services Not Starting?

1. **Check PM2**:
   ```powershell
   pm2 logs --err --lines 100
   ```

2. **Check Price Feeder**:
   ```powershell
   cd C:\imperial-price-feeder
   node dist/index.js
   ```
   (Look for errors in console)

3. **Check MT5**:
   ```powershell
   Get-Process -Name terminal64 | Where-Object { $_.Path -like "*EC Markets*" }
   ```

### INGEST_SECRET Mismatch?

1. **Check VPS .env**:
   ```powershell
   Get-Content C:\imperial-price-feeder\.env | Select-String "INGEST_SECRET"
   ```
   Should be: `INGEST_SECRET=ImperialTrade_IngestSecret_2025_v1`

2. **Check Supabase Dashboard**:
   - Edge Functions → Settings → Secrets
   - Verify `INGEST_SECRET` matches VPS value

3. **Restart Price Feeder**:
   ```powershell
   pm2 restart "Imperial Price Feeder"
   ```

### MT5 Not Running?

```powershell
# Start MT5 manually
Start-Process "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"

# Verify
Get-Process -Name terminal64 | Where-Object { $_.Path -like "*EC Markets*" }
```

The **MT5 Watchdog** should automatically start it if it closes!

---

## 📊 Monitoring

### Check System Health

```powershell
# Run verification script
.\VERIFY_EVERYTHING.ps1
```

### Check Price Updates in Supabase

1. Go to Supabase Dashboard
2. SQL Editor → Run:
   ```sql
   SELECT symbol, mid, updated_at, NOW() - updated_at as age
   FROM market_prices
   ORDER BY updated_at DESC
   LIMIT 10;
   ```
3. Prices should update every few seconds!

---

## ✅ Success Checklist

After setup, verify:

- [ ] All runtime environments installed (Node.js, Python, Deno, PM2)
- [ ] EC Markets MT5 process running
- [ ] PM2 services all "online"
- [ ] Price Feeder sending prices to Supabase (check logs)
- [ ] Watchdogs monitoring services (check logs)
- [ ] Database has recent prices (< 10 seconds old)

---

## 🎯 Next Steps

1. ✅ Run `COMPLETE_VPS_SETUP.ps1` (first time only)
2. ✅ Run `START_ALL_SERVICES.ps1` (every time VPS restarts or to restart services)
3. ✅ Run `VERIFY_EVERYTHING.ps1` (to check health)
4. ✅ Monitor logs with `pm2 logs`
5. ✅ Check Supabase dashboard for price updates

---

**Your live price system is now set up to NEVER die!** 🚀




