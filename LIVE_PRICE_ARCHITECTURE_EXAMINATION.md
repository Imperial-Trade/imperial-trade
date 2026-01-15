# 🔍 Live Price Architecture Examination (Read-Only)

## 📊 How Live Price Works (Currently Working - DO NOT CHANGE)

### Complete Flow:

```
1. MetaAPI Cloud Service
   ↓
   - Provides real-time price data via SDK
   - Connects to MetaAPI account: 4158f3d7-08b5-4e23-9202-18ef753aabe1
   ↓
2. Digital Ocean Worker (index.js)
   ↓
   - Runs on Digital Ocean App Platform
   - Uses MetaAPI SDK to stream prices
   - Subscribes to symbols: XAUUSD, BTCUSD, U30USD, SPXUSD, NDXUSD
   - Receives price ticks via onSymbolPriceUpdated()
   - Buffers prices in memory (500ms throttle)
   ↓
3. Direct Supabase RPC Call
   ↓
   - Calls: upsert_market_price_enhanced()
   - Writes directly to database (bypasses Edge Functions)
   - Updates every 500ms (2 updates/second)
   - Table: market_prices
   ↓
4. Supabase Database
   ↓
   - market_prices table stores:
     * symbol (XAUUSD, BTCUSD, etc.)
     * bid, ask, mid prices
     * timestamp, updated_at
   ↓
5. Frontend (OptimizedWebSocketPriceContext)
   ↓
   - Polls market_prices table every 500ms
   - Uses database queries (not Realtime subscription)
   - Displays prices in UI
```

---

## 🔧 Key Components:

### 1. Digital Ocean Worker (`index.js`)

**Location**: Root directory

**What it does:**
- Connects to MetaAPI using SDK
- Subscribes to market data for 5 symbols
- Listens for price ticks
- Buffers prices in memory
- Writes to Supabase every 500ms

**Key Code:**
```javascript
// Subscribes to symbols
await connection.subscribeToMarketData(symbol);

// Listens for price updates
class PriceUpdateListener extends SynchronizationListener {
  async onSymbolPriceUpdated(instanceIndex, price) {
    // Buffer price in memory
    priceBuffer[price.symbol] = { ... };
  }
}

// Writes to Supabase every 500ms
setInterval(async () => {
  await supabase.rpc('upsert_market_price_enhanced', {
    p_symbol: priceData.symbol,
    p_bid: priceData.bid,
    p_ask: priceData.ask,
    p_mid: priceData.mid,
    p_timestamp: priceData.timestamp
  });
}, 500);
```

---

### 2. Supabase Database Function

**Function**: `upsert_market_price_enhanced()`

**What it does:**
- Accepts symbol, bid, ask, mid, timestamp
- Upserts to `market_prices` table
- Handles mid-only prices (bid/ask can be NULL)
- Updates `updated_at` timestamp

**Location**: `supabase/migrations/20250915235852_7c4f8890-621f-4091-8e30-1d21cb1cd627.sql`

---

### 3. Frontend Price Context

**File**: `src/contexts/OptimizedWebSocketPriceContext.tsx`

**What it does:**
- Polls `market_prices` table every 500ms
- **NO Realtime subscription** (disabled in Phase 5)
- Uses database queries only
- Provides prices to UI components

**Key Code:**
```typescript
// Database polling (500ms interval)
const pollDatabase = async () => {
  const { data } = await supabase
    .from('market_prices')
    .select('symbol, bid, ask, mid, updated_at')
    .in('symbol', activeSymbols);
  
  // Updates prices state
  setPrices(polledPrices);
};
```

---

## 📊 Data Flow Summary:

```
MetaAPI → Digital Ocean Worker → Supabase RPC → market_prices table → Frontend Polling
```

**Update Frequency**: 500ms (2 updates/second)

**Status**: ✅ **WORKING - DO NOT CHANGE**

---

## 🔍 Why Digital Ocean is Used:

1. **MetaAPI SDK**: Requires Node.js runtime
2. **Always-On Service**: Needs to run 24/7
3. **Managed Platform**: Digital Ocean App Platform handles:
   - Auto-restart on crash
   - Scaling
   - Environment variables
   - Health monitoring

---

## ✅ Key Points:

1. **Separate from Broker Sync**: Live price is independent
2. **Uses Digital Ocean**: For MetaAPI worker only
3. **Direct Database Write**: Bypasses Edge Functions (faster)
4. **Frontend Polls**: No Realtime subscription (disabled)
5. **Working**: Do not modify this system

---

## 🎯 Comparison with Broker Sync:

| Aspect | Live Price | Broker Sync |
|--------|-----------|-------------|
| **Infrastructure** | Digital Ocean | Vultr VPS |
| **Data Source** | MetaAPI Cloud | User's MT5 |
| **Update Method** | Continuous (500ms) | On-demand (user connects) |
| **Database Table** | market_prices | trade_journal_entries |
| **Frontend** | Database polling | Realtime subscription |

---

## ✅ Conclusion:

**Live Price System**: ✅ Working with Digital Ocean + MetaAPI  
**Broker Sync System**: ✅ Ready with Vultr VPS + Go Brain

**They are completely separate and don't interfere with each other!**

**You don't need Digital Ocean for broker sync** - Vultr VPS is the correct choice for MT5/Docker/Wine infrastructure. 🚀
