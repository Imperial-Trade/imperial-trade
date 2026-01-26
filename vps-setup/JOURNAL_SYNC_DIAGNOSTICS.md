# 🔍 Journal Sync Diagnostics & Fix Guide

## ❌ **The Problem: Journal History Not Syncing**

## ✅ **The Root Cause: You Need Generic MT5 (NOT EC Markets MT5)**

### **Critical Distinction:**

1. **EC Markets MT5** (`C:\Program Files\EC Markets MetaTrader 5\terminal64.exe`)
   - ✅ Used by: **Imperial Price Feeder** (live prices)
   - ❌ **NOT** used for journal sync
   - **Reserved for live price feeds only**

2. **Generic MT5** (`C:\Program Files\MetaTrader 5\terminal64.exe`)
   - ✅ Used by: **VPS Broker Service** (journal sync)
   - ✅ **REQUIRED** for journal sync to work
   - **This is what syncs trade history**

---

## 🔍 **Architecture Flow:**

```
Frontend (AutoJournalView.tsx)
    ↓ calls
sync-broker-trades Edge Function (Supabase)
    ↓ calls
VPS Broker Service (/fetch-trades endpoint)
    ↓ calls
Python Script (fetch_trades.py)
    ↓ connects to
Generic MT5 Terminal (C:\Program Files\MetaTrader 5\terminal64.exe)
    ↓ fetches
Trade History (last 90 days of closed deals)
    ↓ returns to
Edge Function → Database (trade_journal_entries table)
    ↓ displays in
Frontend Journal
```

---

## ✅ **What You Need to Do:**

### **Step 1: Install Generic MT5**

**If Generic MT5 is NOT installed:**

1. Download MetaTrader 5 from: https://www.metatrader5.com/en/download
2. Install to default location: `C:\Program Files\MetaTrader 5\`
3. **Do NOT** use EC Markets MT5 for this

### **Step 2: Start Generic MT5**

**On your VPS:**

```powershell
# Check if Generic MT5 is running
Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*MetaTrader 5*' -and $_.Path -notlike '*EC Markets*' }

# If not running, start it
Start-Process "C:\Program Files\MetaTrader 5\terminal64.exe"
```

### **Step 3: Log In to Generic MT5 Manually Once**

**IMPORTANT:** Generic MT5 must be logged in manually at least once before auto-sync can work:

1. Open Generic MT5
2. Log in with your broker credentials (same as EC Markets if same broker)
3. **Keep the terminal open and logged in**
4. This allows the Python script to connect programmatically

### **Step 4: Verify VPS Broker Service is Running**

```powershell
# Check if broker service is running
pm2 list | Select-String "imperial-trade-broker-service"

# Check broker service logs
pm2 logs imperial-trade-broker-service --lines 50

# Test broker service health
curl http://localhost:3001/health
```

### **Step 5: Test Journal Sync**

1. **From Frontend**: Go to Journal XX Pro → Auto Journal View
2. **Click "Sync Trades"** button
3. **Check browser console** for errors
4. **Check Edge Function logs**: `supabase functions logs sync-broker-trades`

---

## 🔧 **Troubleshooting:**

### **Error: "MT5 initialization failed"**

**Cause:** Generic MT5 is not running or not initialized

**Fix:**
```powershell
# 1. Start Generic MT5
Start-Process "C:\Program Files\MetaTrader 5\terminal64.exe"

# 2. Log in manually once
# 3. Keep terminal open
# 4. Try sync again
```

### **Error: "Login failed"**

**Cause:** Wrong credentials or server name

**Fix:**
1. Check broker_connections table in Supabase
2. Verify login, password, and server match your Generic MT5 account
3. Server names are case-sensitive!

### **Error: "No deals found"**

**Cause:** No closed trades in last 90 days, or wrong account

**Fix:**
1. Verify you have closed trades in MT5
2. Check the account login ID matches
3. Script fetches last 90 days - if trades are older, they won't sync

### **Error: "VPS service not configured"**

**Cause:** Edge Function can't reach VPS

**Fix:**
1. Check VPS broker service is running: `pm2 list`
2. Check VPS is accessible: `curl http://45.32.89.134:3001/health`
3. Check Supabase secrets: `VPS_MT5_SERVICE_URL` and `VPS_API_KEY`

---

## 📊 **Verification Checklist:**

- [ ] Generic MT5 is installed at `C:\Program Files\MetaTrader 5\terminal64.exe`
- [ ] Generic MT5 is running and logged in
- [ ] Generic MT5 terminal is **open** (not minimized to system tray)
- [ ] VPS Broker Service is running (`pm2 list` shows "imperial-trade-broker-service" online)
- [ ] VPS Broker Service health check works (`curl http://localhost:3001/health`)
- [ ] Supabase secrets are configured (`VPS_MT5_SERVICE_URL` and `VPS_API_KEY`)
- [ ] Broker connection exists in `broker_connections` table
- [ ] Credentials are correct (login, password, server)

---

## 🎯 **Summary:**

**You DO need Generic MT5** (separate from EC Markets MT5) for journal sync to work!

- **EC Markets MT5** = Live prices (already working)
- **Generic MT5** = Journal sync (needs to be installed/running)

They can both run on the same VPS - they're separate processes and don't interfere with each other.

---

**Last Updated**: 2025-01-07



