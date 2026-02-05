# Frontend Code Changes for DigitalOcean Worker Architecture

## File: `src/contexts/OptimizedWebSocketPriceContext.tsx`

## Summary of Changes

This file needs 3 changes to work correctly with the DigitalOcean Worker architecture:

1. **Add `timestamp` to SELECT query** (Line 685)
2. **Use `timestamp` from worker, fallback to `updated_at`** (Line 738)
3. **Set connection status to 'polling'** (Lines 804-806)

---

## Change 1: Add `timestamp` to SELECT Query

**Location:** Line 685

**BEFORE:**
```typescript
.select('symbol, mid, bid, ask, updated_at')
```

**AFTER:**
```typescript
.select('symbol, mid, bid, ask, timestamp, updated_at')
```

**Reason:** The DigitalOcean Worker writes both `timestamp` and `updated_at` fields. We need to query both to match the worker's data structure.

---

## Change 2: Use `timestamp` from Worker

**Location:** Line 738

**BEFORE:**
```typescript
timestamp: row.updated_at,
```

**AFTER:**
```typescript
timestamp: row.timestamp || row.updated_at, // ✅ Use timestamp from worker, fallback to updated_at
```

**Reason:** The worker writes `timestamp` field. We should use it if available, with `updated_at` as fallback.

---

## Change 3: Set Connection Status to 'polling'

**Location:** Lines 804-806

**BEFORE:**
```typescript
if (connectionStatus !== 'connected') {
  setConnectionStatus('connected');
}
```

**AFTER:**
```typescript
// ✅ DigitalOcean Worker Architecture: Set status to 'polling' for database polling mode
// The worker writes to market_prices table every 500ms via upsert_market_price_enhanced RPC
if (connectionStatus !== 'polling' && connectionStatus !== 'connected') {
  setConnectionStatus('polling');
} else if (connectionStatus === 'connected') {
  // Prefer 'polling' status for database polling architecture
  setConnectionStatus('polling');
}
```

**Reason:** For the DigitalOcean Worker architecture (database polling), the connection status should be 'polling' not 'connected' to accurately reflect the data source.

---

## Complete Updated Function

Here's the complete `fetchPricesFromDatabase` function with all changes applied:

```typescript
// ⚡ PHASE 5: NUCLEAR CACHE-BUSTING - Force fresh database reads every poll
// ✅ DigitalOcean Worker Architecture: Polls market_prices table every 500ms
// Worker writes via upsert_market_price_enhanced RPC: symbol, bid, ask, mid, timestamp, updated_at
const fetchPricesFromDatabase = useCallback(async (targetSymbols: string[]) => {
  if (targetSymbols.length === 0) return;

  try {
    // ✅ Get latest prices for each symbol from market_prices table
    // DigitalOcean Worker writes every 500ms via upsert_market_price_enhanced RPC
    const pricePromises = targetSymbols.map(async (symbol) => {
      const normalizedSymbol = normalizeSymbol(symbol);
      if (!normalizedSymbol) return null;
      
      // ✅ Query matches DigitalOcean Worker schema: symbol, bid, ask, mid, timestamp, updated_at
      const { data, error } = await supabase
        .from('market_prices')
        .select('symbol, mid, bid, ask, timestamp, updated_at') // ✅ CHANGE 1: Added timestamp
        .eq('symbol', normalizedSymbol)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error(`❌ [Database Poll] Query error for ${symbol}:`, error);
        return null;
      }
      
      return data && data.length > 0 ? data[0] : null;
    });
    
    const priceResults = await Promise.all(pricePromises);
    const validPrices = priceResults.filter(p => p !== null) as any[];
    
    if (validPrices.length === 0) {
      console.warn(`⚠️ [Database Poll] No prices found for symbols: ${targetSymbols.join(', ')}`);
      return;
    }
    
    // Process the prices we found
    const latestPricesBySymbol = new Map<string, any>();
    validPrices.forEach(row => {
      const normalizedSymbol = normalizeSymbol(row.symbol);
      latestPricesBySymbol.set(normalizedSymbol, row);
    });
    
    if (latestPricesBySymbol.size === 0) {
      console.warn(`⚠️ [Database Poll] No valid prices after normalization`);
      return;
    }
    
    // Process the prices we found
    const hydratedPrices: Record<string, PriceData> = {};
    const timestampUpdates: Record<string, number> = {};
    
    latestPricesBySymbol.forEach((row, normalizedSymbol) => {
      // ✅ MID-ONLY SUPPORT: Prioritize mid, then calculate from bid/ask, then fallback
      const price = row.mid || (row.bid && row.ask ? (row.bid + row.ask) / 2 : row.bid || row.ask);
      
      if (price) {
        const dbTimestamp = new Date(row.updated_at).getTime();
        hydratedPrices[normalizedSymbol] = {
          symbol: normalizedSymbol,
          price,
          change: 0,
          changePercent: 0,
          timestamp: row.timestamp || row.updated_at, // ✅ CHANGE 2: Use timestamp from worker
          receivedAt: Date.now(),
          bid: row.bid,
          ask: row.ask,
          mid: row.mid
        };
        
        timestampUpdates[normalizedSymbol] = dbTimestamp;
      }
    });
    
    if (Object.keys(hydratedPrices).length > 0) {
      // ✅ Always update prices to trigger re-renders (DigitalOcean Worker writes every 500ms)
      setInternalPrices(prev => ({ ...prev, ...hydratedPrices }));
      setPrices(prev => ({ ...prev, ...hydratedPrices }));
      
      Object.keys(timestampUpdates).forEach(symbol => {
        lastDatabaseTimestampRef.current[symbol] = timestampUpdates[symbol];
      });
      
      setLastUpdated(new Date());
      
      // ✅ CHANGE 3: DigitalOcean Worker Architecture - Set status to 'polling'
      if (connectionStatus !== 'polling' && connectionStatus !== 'connected') {
        setConnectionStatus('polling');
      } else if (connectionStatus === 'connected') {
        setConnectionStatus('polling');
      }
    }
  } catch (error) {
    console.error(`❌ [Database Poll] Unexpected error:`, error);
  }
}, [internalPrices, connectionStatus]);
```

---

## Verification After Changes

After applying these changes, verify:

1. ✅ Frontend polls `market_prices` table every 500ms
2. ✅ Query includes `timestamp` field
3. ✅ Connection status shows as 'polling'
4. ✅ Live prices display correctly for all 5 symbols
5. ✅ Prices update every 500ms (2 updates/second)

---

## Architecture Flow

```
MetaApi → DigitalOcean Worker → Supabase Database (upsert_market_price_enhanced)
                                                      ↓
                                              market_prices table
                                                      ↓
                                              Frontend (500ms polling)
                                                      ↓
                                              Live Price Display
```
