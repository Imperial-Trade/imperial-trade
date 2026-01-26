# 🚀 Starting Imperial Price Feeder with MT5

## ⚠️ Prerequisites

The Imperial Price Feeder requires:
1. **EC Markets MT5 Terminal** must be **OPEN** and **LOGGED IN**
2. **Login**: `81071266`
3. **Server**: `ECMarkets-MT5-Live01`
4. **MT5 Terminal** must be running in the background

---

## 📋 Step-by-Step Instructions

### 1. Check if MT5 is Running
```powershell
Get-Process terminal64 -ErrorAction SilentlyContinue
```

### 2. If MT5 is NOT Running, Start It
```powershell
Start-Process "C:\Program Files\MetaTrader 5\terminal64.exe" -WindowStyle Minimized
```

**IMPORTANT**: After starting MT5:
- Log in manually with:
  - **Login**: `81071266`
  - **Password**: (Your EC Markets password)
  - **Server**: `ECMarkets-MT5-Live01`
- Keep MT5 open and logged in

### 3. Verify Price Feeder is Running
```powershell
pm2 status
```

Should show:
```
│ 0  │ Imperial Price Feeder │ online │
```

### 4. Check Price Feeder Logs
```powershell
pm2 logs "Imperial Price Feeder" --lines 20
```

**Success indicators:**
- ✅ `MT5 connected`
- ✅ `Starting price publisher`
- ✅ `Streaming prices to Imperial Trade...`
- ✅ Price updates appearing in logs

**Error indicators:**
- ❌ `Failed to connect to MT5`
- ❌ `MT5 bridge failed to start`
- ❌ `exit code: 1`

---

## 🔧 Troubleshooting

### Issue: "Failed to connect to MT5"

**Solution:**
1. Ensure EC Markets MT5 terminal is open
2. Ensure you're logged in to MT5 with account `81071266`
3. Verify server is `ECMarkets-MT5-Live01`
4. Restart price feeder: `pm2 restart "Imperial Price Feeder"`

### Issue: "MT5 bridge failed to start"

**Solution:**
1. Check if Python is installed: `python --version`
2. Check if MetaTrader5 package is installed: `pip list | findstr MetaTrader5`
3. If not installed: `pip install MetaTrader5`
4. Restart price feeder: `pm2 restart "Imperial Price Feeder"`

### Issue: Price Feeder keeps restarting

**Solution:**
1. Check error logs: `pm2 logs "Imperial Price Feeder" --err --lines 50`
2. Verify MT5 is actually connected (check MT5 terminal window)
3. Verify credentials in `.env` file at `C:\imperial-price-feeder\.env`
4. Restart MT5 terminal and log in again
5. Restart price feeder: `pm2 restart "Imperial Price Feeder"`

---

## ✅ Verification Checklist

After starting the price feeder, verify:

- [ ] MT5 Terminal is open and visible
- [ ] MT5 is logged in (account `81071266` on `ECMarkets-MT5-Live01`)
- [ ] PM2 shows price feeder as "online"
- [ ] Price feeder logs show "MT5 connected"
- [ ] Price feeder logs show price updates
- [ ] No errors in price feeder error log

---

## 📊 Expected Log Output

**Successful connection:**
```
✅ MT5 connection established
✅ MT5 connected - starting price publisher
📡 Starting Price Publisher
   URL: https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-ingestor
   Batch Interval: 500ms
🎉 Price feeder is now running!
📡 Streaming prices to Imperial Trade...
```

**Failed connection:**
```
❌ Failed to connect to MT5: MT5 bridge failed to start (exit code: 1)
   1. Ensure MT5 Terminal is installed on this machine
   2. Check your MT5 credentials in .env file
   Server: ECMarkets-MT5-Live01
```

---

## 🎯 Quick Start Command

If MT5 is already open and logged in:
```powershell
pm2 restart "Imperial Price Feeder"
pm2 save
pm2 logs "Imperial Price Feeder" --lines 20
```

---

**Last Updated**: 2026-01-09 02:50 UTC
