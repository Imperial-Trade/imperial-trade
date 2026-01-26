# ✅ PRICE FEEDER SERVICE - READY TO DEPLOY

## 🎯 Status

**PRICE FEEDER SERVICE CREATED** ✅
- ✅ TypeScript source code: `vps-setup/imperial-price-feeder/src/index.ts`
- ✅ Python MT5 reader: `vps-setup/imperial-price-feeder/python/mt5_price_reader.py`
- ✅ Package configuration: `package.json`, `tsconfig.json`
- ✅ Setup scripts: `DEPLOY_PRICE_FEEDER_COMPLETE.ps1`

**CURRENT ISSUE**: Prices are stale (~1.75 hours old)
- ❌ Price Feeder service NOT running on VPS
- ❌ Need to install and start service

---

## 🚀 Deployment Steps

### Step 1: Copy Files to VPS

**On your local machine:**

```bash
# Files to copy to VPS:
# 1. vps-setup/imperial-price-feeder/src/index.ts
# 2. vps-setup/imperial-price-feeder/python/mt5_price_reader.py
# 3. vps-setup/imperial-price-feeder/package.json
# 4. vps-setup/imperial-price-feeder/tsconfig.json
```

**On VPS (via RDP/Console):**

1. Create directory structure:
   ```powershell
   mkdir C:\imperial-price-feeder\src
   mkdir C:\imperial-price-feeder\python
   mkdir C:\imperial-price-feeder\logs
   ```

2. Copy files:
   - `index.ts` → `C:\imperial-price-feeder\src\index.ts`
   - `mt5_price_reader.py` → `C:\imperial-price-feeder\python\mt5_price_reader.py`
   - `package.json` → `C:\imperial-price-feeder\package.json`
   - `tsconfig.json` → `C:\imperial-price-feeder\tsconfig.json`

### Step 2: Install Dependencies

```powershell
cd C:\imperial-price-feeder

# Install Node.js dependencies
npm install

# Install Python MetaTrader5 package
python -m pip install MetaTrader5

# Install TypeScript (if not already installed)
npm install -g typescript
```

### Step 3: Create .env File

```powershell
cd C:\imperial-price-feeder

$envContent = @"
SUPABASE_FUNCTION_URL=https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-ingestor
INGEST_SECRET=ImperialTrade_IngestSecret_2025_v1
PRICE_INTERVAL=1000
SYMBOLS=XAUUSD,BTCUSD,EURUSD,GBPUSD,USDJPY,U30USD,SPXUSD,NDXUSD
"@

Set-Content -Path ".env" -Value $envContent
```

### Step 4: Build TypeScript

```powershell
cd C:\imperial-price-feeder
npm run build
```

### Step 5: Test Python Script

```powershell
cd C:\imperial-price-feeder
python python\mt5_price_reader.py XAUUSD BTCUSD
```

**Expected output:**
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
  {
    "symbol": "BTCUSD",
    "bid": 43500.00,
    "ask": 43510.00,
    "mid": 43505.00,
    "price": 43505.00,
    "timestamp": "2026-01-07T21:30:00Z"
  }
]
```

**If error:** Ensure EC Markets MT5 is running and logged in!

### Step 6: Ensure EC Markets MT5 is Running

```powershell
# Check if MT5 is running
Get-Process -Name terminal64 | Where-Object { $_.Path -like "*EC Markets*" }

# If not running, start it:
Start-Process "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"

# IMPORTANT: Log in to EC Markets account in MT5!
```

### Step 7: Start Price Feeder Service

```powershell
cd C:\imperial-price-feeder

# Start with PM2
pm2 start pm2-ecosystem.config.js

# Save PM2 configuration (auto-start on boot)
pm2 save
```

### Step 8: Verify Service is Running

```powershell
# Check PM2 status
pm2 list

# Check logs
pm2 logs "Imperial Price Feeder" --lines 50
```

**Expected logs:**
```
🚀 Starting Imperial Price Feeder...
📍 Supabase Function: https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-ingestor
📊 Symbols: XAUUSD,BTCUSD,EURUSD,GBPUSD,USDJPY,U30USD,SPXUSD,NDXUSD
⏱️  Interval: 1000ms
🔑 Ingest Secret: ImperialTr...
✅ Sent 100 prices (100 successful, 0 failed)
```

### Step 9: Verify Prices in Supabase

Run in Supabase SQL Editor:

```sql
SELECT symbol, mid, updated_at, 
EXTRACT(EPOCH FROM (NOW() - updated_at)) as seconds_ago
FROM market_prices 
ORDER BY updated_at DESC 
LIMIT 5;
```

**Should show:** `seconds_ago < 5` (prices updated within last 5 seconds)

### Step 10: Verify Frontend

Open: http://localhost:8080/signals
- ✅ Live prices should update every 1-2 seconds
- ✅ Connection status should show "connected"
- ✅ Prices should be recent (not stale)

---

## ✅ Success Criteria

After deployment, verify:

- [ ] EC Markets MT5 is running and logged in
- [ ] Python MetaTrader5 package installed
- [ ] Price Feeder service running in PM2 (`pm2 list` shows "online")
- [ ] Logs show successful price sends
- [ ] Prices updating in Supabase (`seconds_ago < 5`)
- [ ] Frontend shows live prices updating
- [ ] Connection status shows "connected"

---

## 🚨 Troubleshooting

### Error: "MT5 initialization failed"

**Fix:**
1. Ensure EC Markets MT5 is running
2. Ensure MT5 is logged in to EC Markets account
3. Check MT5 terminal is not minimized/hidden

### Error: "Python script failed"

**Fix:**
```powershell
# Reinstall MetaTrader5
python -m pip uninstall MetaTrader5
python -m pip install MetaTrader5

# Test Python script
python C:\imperial-price-feeder\python\mt5_price_reader.py XAUUSD
```

### Error: "401 Unauthorized"

**Fix:**
1. Check `.env` file has correct `INGEST_SECRET`
2. Verify Supabase Edge Function secret matches:
   - VPS `.env`: `INGEST_SECRET=ImperialTrade_IngestSecret_2025_v1`
   - Supabase: Check Settings → Edge Functions → Secrets → `INGEST_SECRET`

### No Prices Appearing in Database

**Fix:**
1. Check PM2 logs: `pm2 logs "Imperial Price Feeder"`
2. Check Python can read from MT5: `python python\mt5_price_reader.py XAUUSD`
3. Check EC Markets MT5 is running and logged in
4. Check network: `Test-NetConnection kmuoqkcxguafxulqlbmi.supabase.co -Port 443`

---

## 📊 Architecture

```
EC Markets MT5 Terminal (Windows VPS)
    ↓
Python Script (mt5_price_reader.py)
    ↓
Node.js Service (index.ts)
    ↓
Supabase Edge Function (price-ingestor)
    ↓
market_prices table (Supabase)
    ↓
Frontend (OptimizedWebSocketPriceContext)
    ↓
Live Price Display
```

---

## 🎉 Next Steps After Deployment

Once Price Feeder is running:

1. ✅ Prices will update every 1 second
2. ✅ Frontend will show live prices
3. ✅ Notifications will trigger on TP/SL hits
4. ✅ System will NEVER die (watchdog monitors service)
5. ✅ Services auto-start on boot

---

## 📝 Files Ready

All files are in `vps-setup/imperial-price-feeder/`:

- ✅ `src/index.ts` - TypeScript service code
- ✅ `python/mt5_price_reader.py` - Python MT5 reader
- ✅ `package.json` - Node.js dependencies
- ✅ `tsconfig.json` - TypeScript configuration

**Ready to deploy! Follow the steps above!** 🚀




