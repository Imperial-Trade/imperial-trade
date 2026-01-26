# GitHub Worker Repository Verification Checklist

## Repository: https://github.com/Imperial-Trade/imperial-trade-ingress-worker

### ✅ Step 1: Verify index.js
**File Location:** `index.js` (root directory)

**Required Code Elements:**
- [ ] MetaApi SDK initialization: `const api = new MetaApi(token);`
- [ ] Supabase client initialization: `const supabase = createClient(supabaseUrl, supabaseKey);`
- [ ] Target symbols array: `['XAUUSD', 'BTCUSD', 'U30USD', 'SPXUSD', 'NDXUSD']`
- [ ] Price buffer object: `let priceBuffer = {};`
- [ ] Connection state management
- [ ] MetaApi account deployment wait logic
- [ ] Connection health status wait logic
- [ ] Streaming connection setup: `connection = account.getStreamingConnection();`
- [ ] Synchronization wait: `await connection.waitSynchronized({ timeoutInSeconds: 300 });`
- [ ] Symbol subscription: `await connection.subscribeToMarketData(symbol);`
- [ ] Price tick listener: `connection.terminalState.on('price', (price) => {...})`
- [ ] **CRITICAL:** Sync interval: `setInterval(..., 500)` (500ms = 2 updates/second)
- [ ] **CRITICAL:** RPC call: `supabase.rpc('upsert_market_price_enhanced', { p_symbol, p_bid, p_ask, p_mid, p_timestamp })`
- [ ] Environment variable validation with error messages
- [ ] Auto-restart logic with exponential backoff (max 10 attempts)
- [ ] Graceful shutdown handlers (SIGTERM, SIGINT)
- [ ] Error logging with timestamps

**Key Code Snippet to Verify:**
```javascript
// Should have this sync interval:
syncInterval = setInterval(async () => {
  const updates = Object.values(priceBuffer);
  // ... prepare upsertData ...
  const { error } = await supabase.rpc('upsert_market_price_enhanced', {
    p_symbol: priceData.symbol,
    p_bid: priceData.bid,
    p_ask: priceData.ask,
    p_mid: priceData.mid,
    p_timestamp: priceData.timestamp
  });
}, 500); // ✅ Must be 500ms
```

### ✅ Step 2: Verify package.json
**File Location:** `package.json` (root directory)

**Required Fields:**
- [ ] `"name": "imperial-ingress-worker"`
- [ ] `"main": "index.js"`
- [ ] `"scripts": { "start": "node index.js" }`
- [ ] `"dependencies": { "metaapi.cloud-sdk": "^21.0.0" }`
- [ ] `"dependencies": { "@supabase/supabase-js": "^2.39.0" }`
- [ ] `"engines": { "node": ">=18.0.0" }`

### ✅ Step 3: Verify Environment Variables (DigitalOcean App Settings)
**Location:** DigitalOcean Dashboard → App → Settings → Variables

**Required Variables:**
- [ ] `META_API_TOKEN` = (your MetaApi token)
- [ ] `META_API_ACCOUNT_ID` = `4158f3d7-08b5-4e23-9202-18ef753aabe1`
- [ ] `SUPABASE_URL` = `https://kmuoqkcxguafxulqlbmi.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (your service role key)

### ✅ Step 4: Verify RPC Function Call
**In index.js, verify the upsert call:**
- [ ] Function name: `upsert_market_price_enhanced`
- [ ] Parameters match:
  - `p_symbol`: string
  - `p_bid`: numeric (nullable)
  - `p_ask`: numeric (nullable)
  - `p_mid`: numeric (nullable)
  - `p_timestamp`: timestamp with time zone
- [ ] Error handling present for RPC calls

### ✅ Step 5: Verify Database Schema Match
**Worker writes these fields:**
- [ ] `symbol` (TEXT)
- [ ] `bid` (NUMERIC, nullable)
- [ ] `ask` (NUMERIC, nullable)
- [ ] `mid` (NUMERIC)
- [ ] `timestamp` (TIMESTAMP WITH TIME ZONE)
- [ ] `updated_at` (TIMESTAMP WITH TIME ZONE, auto-set by function)

**Frontend queries these fields:**
- [ ] `symbol`
- [ ] `bid`
- [ ] `ask`
- [ ] `mid`
- [ ] `timestamp` ✅ **MUST BE INCLUDED**
- [ ] `updated_at`

### ✅ Step 6: Verify Sync Frequency
- [ ] Worker sync interval: **500ms** (2 updates/second)
- [ ] Frontend polling interval: **500ms** (for live price pages)
- [ ] Both match for optimal synchronization

### ✅ Step 7: Verify Symbol Normalization
**Worker symbols:** `['XAUUSD', 'BTCUSD', 'U30USD', 'SPXUSD', 'NDXUSD']`
**Frontend normalization:**
- [ ] `US30` → `U30USD` ✅
- [ ] `SPX` → `SPXUSD` ✅
- [ ] `NAS100` → `NDXUSD` ✅
- [ ] All 5 symbols match between worker and frontend

---

## Verification Results

After checking the GitHub repository:

- [ ] **index.js** matches requirements
- [ ] **package.json** has correct dependencies
- [ ] **Environment variables** are set in DigitalOcean
- [ ] **RPC function call** is correct
- [ ] **Database schema** matches between worker and frontend
- [ ] **Sync frequency** is 500ms (worker) and 500ms (frontend)
- [ ] **Symbols** match and normalize correctly

---

## Next Steps After Verification

1. ✅ If all checks pass → Apply frontend code changes
2. ✅ Deploy worker to DigitalOcean (if not already deployed)
3. ✅ Test live price display in frontend
4. ✅ Verify prices update every 500ms
