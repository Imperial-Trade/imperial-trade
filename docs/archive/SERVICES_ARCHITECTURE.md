# 🏗️ SERVICES ARCHITECTURE - Two Separate Services

## ⚠️ CRITICAL DISTINCTION

**IMPERIAL PRICE FEEDER** and **BROKER SERVICE** are **TWO DIFFERENT THINGS**:

---

## 1️⃣ IMPERIAL PRICE FEEDER
**Purpose**: LIVE PRICE FEEDS ONLY

### Details:
- **Directory**: `C:\imperial-price-feeder`
- **PM2 Service Name**: `Imperial Price Feeder`
- **Watchdog**: `Price Feeder Watchdog`
- **Purpose**: Reads live prices from MT5 and sends to Supabase

### Data Flow:
```
EC Markets MT5 Terminal
    ↓
Imperial Price Feeder (Node.js service on VPS)
    ↓
price-ingestor Edge Function (Supabase)
    ↓
market_prices table (Supabase)
    ↓
Frontend Live Price Display (OptimizedWebSocketPriceContext)
```

### What it does:
- ✅ Reads real-time prices from MT5 terminal
- ✅ Sends prices to `price-ingestor` Edge Function
- ✅ Updates `market_prices` table in Supabase
- ✅ Powers live price display in frontend

### Configuration:
- **Environment File**: `C:\imperial-price-feeder\.env`
- **Required Secret**: `INGEST_SECRET=ImperialTrade_IngestSecret_2025_v1`
- **Supabase Endpoint**: `price-ingestor` Edge Function

---

## 2️⃣ VPS BROKER SERVICE
**Purpose**: JOURNAL/TRADE SYNC ONLY

### Details:
- **Directory**: `C:\vps-broker-service`
- **PM2 Service Name**: `imperial-trade-broker-service`
- **Port**: `3001`
- **Purpose**: Handles journal functionality - trade syncing, MT5 connections

### Data Flow:
```
MT5 Terminal (Generic MT5 or EC Markets MT5)
    ↓
VPS Broker Service (Express server on VPS - port 3001)
    ↓
Supabase Edge Functions (test-connection, sync-trades, etc.)
    ↓
trade_journal_entries table (Supabase)
    ↓
Frontend Journal Features
```

### What it does:
- ✅ Tests MT5 connections
- ✅ Syncs trades from MT5 to journal
- ✅ Fetches trade history
- ✅ Handles account credentials (encrypted)
- ✅ Provides journal/trade data APIs

### Configuration:
- **Environment File**: `C:\vps-broker-service\.env`
- **Required Secret**: `VPS_API_KEY=bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`
- **Supabase Secret**: `VPS_MT5_SERVICE_URL=http://45.32.89.134:3001`
- **Endpoint**: `http://45.32.89.134:3001`

---

## 📊 Comparison Table

| Feature | Imperial Price Feeder | VPS Broker Service |
|---------|----------------------|-------------------|
| **Purpose** | Live Price Feeds | Journal/Trade Sync |
| **Directory** | `C:\imperial-price-feeder` | `C:\vps-broker-service` |
| **PM2 Name** | `Imperial Price Feeder` | `imperial-trade-broker-service` |
| **Port** | N/A (HTTP client) | `3001` |
| **Target Table** | `market_prices` | `trade_journal_entries` |
| **Edge Function** | `price-ingestor` | Various journal functions |
| **MT5 Terminal** | EC Markets MT5 | Generic MT5 or EC Markets MT5 |
| **Frontend Use** | Live price display | Journal features |
| **Watchdog** | Price Feeder Watchdog | N/A (optional) |

---

## 🔧 Setup on VPS

### Imperial Price Feeder:
```powershell
cd C:\imperial-price-feeder
pm2 start pm2-ecosystem.config.js
# OR
pm2 start dist\index.js --name "Imperial Price Feeder"
```

### VPS Broker Service:
```powershell
cd C:\vps-broker-service
pm2 start dist\index.js --name imperial-trade-broker-service
```

---

## ✅ Verification

### Check Price Feeder:
```powershell
pm2 list | Select-String "Imperial Price Feeder"
pm2 logs "Imperial Price Feeder" --lines 50
```

### Check Broker Service:
```powershell
pm2 list | Select-String "imperial-trade-broker-service"
curl http://45.32.89.134:3001/health
pm2 logs imperial-trade-broker-service --lines 50
```

---

## 🎯 Summary

**DO NOT CONFUSE THE TWO:**

1. **Imperial Price Feeder** = Live prices → `market_prices` table → Frontend live price display
2. **VPS Broker Service** = Trade journal → `trade_journal_entries` table → Frontend journal features

They are **completely separate services** with different purposes!

---

**Last Updated**: 2025-01-07




