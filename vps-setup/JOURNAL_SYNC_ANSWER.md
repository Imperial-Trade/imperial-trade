# ✅ Journal Sync - Complete Answer

## ❓ **Your Question:**
"Why is journal not syncing history from MT5? Does Generic MT5 work or do I need specific broker MT5?"

---

## ✅ **Answer:**

### **You Need Generic MT5 (NOT EC Markets MT5) for Journal Sync**

**CRITICAL DISTINCTION:**

1. **EC Markets MT5** (`C:\Program Files\EC Markets MetaTrader 5\terminal64.exe`)
   - ✅ **Used for**: Live price feeds (Imperial Price Feeder)
   - ❌ **NOT used for**: Journal sync
   - **Purpose**: Reads live prices only

2. **Generic MT5** (`C:\Program Files\MetaTrader 5\terminal64.exe`)
   - ✅ **Used for**: Journal sync (VPS Broker Service)
   - ✅ **REQUIRED** for trade history sync
   - **Purpose**: Fetches closed trades from your broker account

---

## 🏗️ **Architecture:**

```
Frontend (Journal XX Pro)
    ↓
sync-broker-trades Edge Function (Supabase)
    ↓
VPS Broker Service (/fetch-trades endpoint)
    ↓
Python Script (fetch_trades.py)
    ↓
Generic MT5 Terminal (C:\Program Files\MetaTrader 5\terminal64.exe)
    ↓
Fetches closed trades (last 90 days)
    ↓
Returns to Edge Function → Database → Frontend
```

---

## ✅ **What You Need:**

### **Step 1: Install Generic MT5** (if not installed)

**Download:** https://www.metatrader5.com/en/download

**Install to:** `C:\Program Files\MetaTrader 5\`

### **Step 2: Start Generic MT5**

```powershell
# Start Generic MT5
Start-Process "C:\Program Files\MetaTrader 5\terminal64.exe"
```

### **Step 3: Log In to Generic MT5 Manually**

**IMPORTANT:** Generic MT5 must be logged in manually at least once before auto-sync can work:

1. Open Generic MT5
2. Log in with your broker credentials (same as EC Markets if same broker)
3. **Keep the terminal OPEN and logged in**
4. This allows Python script to connect programmatically

### **Step 4: Verify Setup**

**Run this on VPS:**
```powershell
.\vps-setup\CHECK_MT5_SETUP.ps1
```

**Or run:**
```powershell
.\vps-setup\FIX_JOURNAL_SYNC.ps1
```

---

## 🔧 **Troubleshooting:**

### **Error: "MT5 initialization failed"**

**Cause:** Generic MT5 is not running or not initialized

**Fix:**
1. Start Generic MT5: `Start-Process "C:\Program Files\MetaTrader 5\terminal64.exe"`
2. Log in manually once
3. Keep terminal open
4. Try sync again

### **Error: "Login failed"**

**Cause:** Wrong credentials or server name

**Fix:**
1. Verify broker_connections table has correct credentials
2. Server names are case-sensitive!
3. Login ID must be numeric

### **Error: "No deals found"**

**Cause:** No closed trades in last 90 days, or wrong account

**Fix:**
1. Verify you have closed trades in MT5
2. Check account login ID matches
3. Script fetches last 90 days only

---

## 📊 **Verification Checklist:**

- [ ] Generic MT5 is installed at `C:\Program Files\MetaTrader 5\terminal64.exe`
- [ ] Generic MT5 is running (`Get-Process -Name terminal64 | Where-Object { $_.Path -like '*MetaTrader 5*' -and $_.Path -notlike '*EC Markets*' }`)
- [ ] Generic MT5 is logged in manually (terminal shows account logged in)
- [ ] Generic MT5 terminal is **open** (not minimized)
- [ ] VPS Broker Service is running (`pm2 list | Select-String "imperial-trade-broker-service"`)
- [ ] Broker Service health check works (`curl http://localhost:3001/health`)
- [ ] Supabase secrets configured (`VPS_MT5_SERVICE_URL` and `VPS_API_KEY`)
- [ ] Broker connection exists in `broker_connections` table

---

## 🎯 **Summary:**

**Answer:** 
- ✅ **Generic MT5 works** for journal sync
- ❌ **You don't need specific broker MT5** - Generic MT5 can connect to any broker
- ✅ **Both terminals can run simultaneously** on the same VPS:
  - **EC Markets MT5** = Live prices (already working)
  - **Generic MT5** = Journal sync (needs to be installed/running)

**They are separate processes and don't interfere with each other!**

---

**Last Updated**: 2025-01-07



