# 🚀 INSTALL PRICE FEEDER NOW - Get Live Prices from MT5 EC Markets

## ⚠️ Current Status

**PRICES ARE STALE** - Last updated ~1.75 hours ago
- Need to install and start Price Feeder service
- Service reads from MT5 EC Markets terminal
- Sends prices to Supabase price-ingestor Edge Function

---

## 📋 Quick Setup Steps

### Step 1: Connect to VPS
- Go to: https://my.vultr.com → View Console
- OR RDP: `45.32.89.134:3389`
- Username: `Administrator`
- Password: `2#bWj}tv=}5d}u5}`

### Step 2: Open PowerShell as Administrator

### Step 3: Copy Price Feeder Files

**Option A: Manual Copy (Easiest)**

1. **Copy files from your local machine to VPS:**
   - `vps-setup/imperial-price-feeder/src/index.ts` → `C:\imperial-price-feeder\src\index.ts`
   - `vps-setup/imperial-price-feeder/python/mt5_price_reader.py` → `C:\imperial-price-feeder\python\mt5_price_reader.py`
   - `vps-setup/imperial-price-feeder/package.json` → `C:\imperial-price-feeder\package.json`
   - `vps-setup/imperial-price-feeder/tsconfig.json` → `C:\imperial-price-feeder\tsconfig.json`

2. **Run setup script:**
   ```powershell
   # Copy entire content of DEPLOY_PRICE_FEEDER_COMPLETE.ps1
   # Paste into PowerShell and execute
   ```

**Option B: Use DEPLOY_PRICE_FEEDER_COMPLETE.ps1**

1. **Copy entire content** of `vps-setup/DEPLOY_PRICE_FEEDER_COMPLETE.ps1`
2. **Paste into PowerShell** on VPS
3. **Press Enter**
4. **Then manually copy** `src/index.ts` to `C:\imperial-price-feeder\src\index.ts`

---

## 🔧 Installation Steps

### 1. Install Dependencies

```powershell
cd C:\imperial-price-feeder
npm install
```

### 2. Install Python MetaTrader5 Package

```powershell
python -m pip install MetaTrader5
```

### 3. Build TypeScript

```powershell
cd C:\imperial-price-feeder
npm run build
```

### 4. Verify .env File

```powershell
Get-Content C:\imperial-price-feeder\.env
```

Should show:
```
SUPABASE_FUNCTION_URL=https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-ingestor
INGEST_SECRET=ImperialTrade_IngestSecret_2025_v1
PRICE_INTERVAL=1000
SYMBOLS=XAUUSD,BTCUSD,EURUSD,GBPUSD,USDJPY,U30USD,SPXUSD,NDXUSD
```

### 5. Ensure EC Markets MT5 is Running

```powershell
Get-Process -Name terminal64 | Where-Object { $_.Path -like "*EC Markets*" }
```

If not running:
```powershell
Start-Process "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
```

**IMPORTANT**: MT5 must be logged in to an EC Markets account!

### 6. Test Python Script Manually

```powershell
cd C:\imperial-price-feeder
python python\mt5_price_reader.py XAUUSD BTCUSD
```

Should output JSON with prices like:
```json
[
  {
    "symbol": "XAUUSD",
    "bid": 2025.50,
    "ask": 2025.60,
    "mid": 2025.55,
    "price": 2025.55,
    "timestamp": "2026-01-07T21:30:00Z"
  },
  ...
]
```

### 7. Start Price Feeder Service

```powershell
cd C:\imperial-price-feeder
pm2 start pm2-ecosystem.config.js
pm2 save
```

### 8. Check Logs

```powershell
pm2 logs "Imperial Price Feeder" --lines 50
```

Should show:
```
🚀 Starting Imperial Price Feeder...
📍 Supabase Function: https://...
📊 Symbols: XAUUSD, BTCUSD, ...
✅ Sent 100 prices (100 successful, 0 failed)
```

---

## ✅ Verify It's Working

### Check PM2 Status
```powershell
pm2 list
```

Should show:
```
┌─────┬──────────────────────────┬─────────┬─────────┬───────────┐
│ id  │ name                     │ status  │ restart │ uptime    │
├─────┼──────────────────────────┼─────────┼─────────┼───────────┤
│ 0   │ Imperial Price Feeder    │ online  │ 0       │ 2m        │
└─────┴──────────────────────────┴─────────┴─────────┴───────────┘
```

### Check Logs
```powershell
pm2 logs "Imperial Price Feeder" --lines 50
```

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

### Check Frontend

Open: http://localhost:8080/signals
- Prices should update every 1-2 seconds
- Live price indicators should be green

---

## 🚨 Troubleshooting

### Error: "MT5 initialization failed"

**Solution:**
1. Ensure EC Markets MT5 is running
2. Ensure MT5 is logged in to EC Markets account
3. Check MT5 terminal is not minimized/hidden

### Error: "Python script failed"

**Solution:**
```powershell
# Install MetaTrader5 package
python -m pip install MetaTrader5

# Test Python script
python C:\imperial-price-feeder\python\mt5_price_reader.py XAUUSD
```

### Error: "Failed to send prices" or "401 Unauthorized"

**Solution:**
1. Check `.env` file has correct `INGEST_SECRET`
2. Verify Supabase Edge Function secret matches:
   - VPS `.env`: `INGEST_SECRET=ImperialTrade_IngestSecret_2025_v1`
   - Supabase Secret: `INGEST_SECRET=ImperialTrade_IngestSecret_2025_v1`

### No Prices Appearing

**Solution:**
1. Check PM2 logs: `pm2 logs "Imperial Price Feeder"`
2. Check Python can read from MT5: `python python\mt5_price_reader.py XAUUSD`
3. Check EC Markets MT5 is running and logged in
4. Check network connectivity: `Test-NetConnection kmuoqkcxguafxulqlbmi.supabase.co -Port 443`

---

## ✅ Success Checklist

After setup, verify:

- [ ] EC Markets MT5 is running and logged in
- [ ] Python MetaTrader5 package installed
- [ ] Price Feeder service running in PM2 (`pm2 list` shows "online")
- [ ] Logs show successful price sends
- [ ] Prices updating in Supabase (check SQL query - `seconds_ago < 5`)
- [ ] Frontend shows live prices updating

---

## 🎯 Next Steps

Once Price Feeder is running:

1. ✅ Prices will update every 1 second
2. ✅ Frontend will show live prices
3. ✅ Notifications will trigger on TP/SL hits
4. ✅ System will NEVER die (watchdog monitors service)

---

**Ready? Follow the steps above to install the Price Feeder!** 🚀




