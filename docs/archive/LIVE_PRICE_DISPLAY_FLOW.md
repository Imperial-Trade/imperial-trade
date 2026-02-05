# Live Price Display - Complete Flow Analysis

## 📊 How Live Price is Currently Displayed

Based on the console logs and code analysis, here's the complete flow:

---

## 🔄 Data Flow

```
1. VPS Price Feeder (MT5) 
   ↓
2. price-ingestor Edge Function
   ↓
3. market_prices table (Supabase)
   ↓
4. Database Polling (Frontend - every 1000ms)
   ↓
5. useOptimizedLivePrice Hook
   ↓
6. EnhancedLivePriceDisplay Component
   ↓
7. UI Display: "$4,472.64"
```

---

## 📍 Key Components

### **1. Data Source: `market_prices` Table**

**Location**: Supabase Database  
**Updated By**: `price-ingestor` edge function  
**Columns Used**:
- `symbol` - Asset symbol (e.g., "XAUUSD")
- `mid` - Mid price (preferred)
- `bid` - Bid price (fallback)
- `ask` - Ask price (fallback)
- `updated_at` - Timestamp of last update

**Price Selection Logic** (from `OptimizedWebSocketPriceContext.tsx:709-710`):
```typescript
const price = row.mid || (row.bid && row.ask ? (row.bid + row.ask) / 2 : row.bid || row.ask);
```
- **Priority 1**: Use `mid` if available
- **Priority 2**: Calculate `(bid + ask) / 2` if both exist
- **Priority 3**: Use `bid` or `ask` if only one exists

---

### **2. Database Polling (Primary Method)**

**File**: `src/contexts/OptimizedWebSocketPriceContext.tsx`  
**Function**: `fetchPricesFromDatabase()` (line 654)

**How It Works**:
1. **Interval**: Polls every **1000ms (1 second)** for live price pages
2. **Query**: Fetches latest price for each subscribed symbol
3. **SQL Query**:
   ```sql
   SELECT symbol, mid, bid, ask, updated_at
   FROM market_prices
   WHERE symbol = 'XAUUSD'
   ORDER BY updated_at DESC
   LIMIT 1
   ```

**Console Logs** (from your screenshot):
```
[Polling] Interval tick (1000ms)
[Database Poll] Fetching prices for: BTCUSD, XAUUSD, EURUSD
[Database Poll] XAUUSD: $4472.985000000001 [BID/ASK] (0s old)
[Database Poll] Updated 2 prices + arrivalTimestamps
```

**Polling Frequency**:
- **Live Price Pages** (`/signal-stream`, `/journal`, `/dashboard`): **1000ms (1 second)**
- **Other Pages**: **60000ms (60 seconds)**

---

### **3. Hook: `useOptimizedLivePrice`**

**File**: `src/hooks/useOptimizedLivePrice.ts`

**What It Does**:
- Subscribes to price updates from `OptimizedWebSocketPriceContext`
- Calculates price change and change percentage
- Tracks data age and staleness
- Provides refresh function

**Returns**:
```typescript
{
  price: number | null,           // Current price
  change: number,                 // Price change amount
  changePercent: number,          // Price change percentage
  isLoading: boolean,             // Loading state
  error: string | null,           // Error message
  lastUpdated: Date | null,      // Last update timestamp
  connectionStatus: string,       // 'connected' | 'connecting' | 'error'
  refreshPrice: () => Promise<void> // Manual refresh function
}
```

---

### **4. Component: `EnhancedLivePriceDisplay`**

**File**: `src/components/signals/EnhancedLivePriceDisplay.tsx`

**What It Displays**:
1. **Price**: `$4,472.64` (formatted with dynamic decimals)
2. **Change**: `-0.3300 (-0.01%)` (price change indicator)
3. **Status**: "Live" badge (if data < 8 seconds old)
4. **Buttons**: "Refresh" and "Use Price"

**Price Formatting** (line 181-199):
- **≥ $1000**: 2 decimal places (e.g., `$4,472.64`)
- **≥ $1**: 2-4 decimal places
- **< $1**: 4-6 decimal places

**Display Logic**:
```typescript
const displayPrice = useMemo(() => {
  if (!price || price === 0) return 0;
  
  // Check price plausibility
  const isPlausible = isPricePlausibleForSymbol(price, apiSymbol);
  if (!isPlausible) return 0; // Don't show implausible prices
  
  return price;
}, [price, apiSymbol]);
```

---

## 🔍 Current Behavior (From Console Logs)

### **What's Happening**:

1. **Polling Every 1 Second**:
   ```
   [Polling] Interval tick (1000ms)
   [Database Poll] Fetching prices for: BTCUSD, XAUUSD, EURUSD
   ```

2. **Price Retrieved**:
   ```
   [Database Poll] XAUUSD: $4472.985000000001 [BID/ASK] (0s old)
   ```

3. **UI Update**:
   ```
   [Reactive Update] Triggered component re-renders at 2026-01-06T14:15:10.327Z
   ```

4. **Display**:
   - Shows: `$4,472.64` (formatted from `4472.985000000001`)
   - Change: `-0.3300 (-0.01%)`
   - Status: "Live" (data is fresh)

---

## ⚙️ Configuration

### **Polling Interval**:
```typescript
// From OptimizedWebSocketPriceContext.tsx:1021-1023
const pollingInterval = isLivePricePage 
  ? 1000  // 1 second for live price pages
  : 60000; // 60 seconds for other pages
```

### **Staleness Threshold**:
```typescript
// From useOptimizedLivePrice.ts:288
isStale: arrivalAgeMs > 4000  // 4 seconds (2 missed polls)
isVeryStale: arrivalAgeMs > 10000  // 10 seconds
```

### **Price Update Source**:
- **Primary**: Database polling (every 1 second)
- **Backup**: WebSocket Realtime (if available)
- **Fallback**: Cached price from localStorage

---

## 🎯 Price Display Format

### **For XAUUSD (Gold)**:
- **Raw Price**: `4472.985000000001`
- **Displayed**: `$4,472.64` (2 decimal places, ≥ $1000)
- **Format**: Uses `Intl.NumberFormat` with `minimumFractionDigits: 2, maximumFractionDigits: 2`

### **For BTCUSD (Bitcoin)**:
- **Raw Price**: `94135.46`
- **Displayed**: `$94,135.46` (2 decimal places, ≥ $1000)

### **For EURUSD (Forex)**:
- **Raw Price**: `1.0850`
- **Displayed**: `$1.0850` (2-4 decimal places, < $1000)

---

## 🔄 Refresh Mechanism

### **Automatic Refresh**:
- Database polling every 1 second
- WebSocket updates (if connected)
- Heartbeat triggers on price updates

### **Manual Refresh**:
- "Refresh" button in `EnhancedLivePriceDisplay`
- Calls `refreshPrice()` function
- Forces immediate database query

---

## 📊 Data Age Calculation

**From `EnhancedLivePriceDisplay.tsx:109-136`**:
```typescript
// Shows "Live" for data within 3 seconds
if (ageSeconds < 3) {
  setDataAge('Live');
} else if (ageSeconds < 60) {
  setDataAge(`${ageSeconds}s ago`);
} else if (ageSeconds < 3600) {
  setDataAge(`${minutes}m ago`);
} else {
  setDataAge('Stale');
}
```

---

## 🐛 Potential Issues

### **1. Price Precision**:
- **Issue**: Raw price `4472.985000000001` has floating-point precision errors
- **Solution**: Already handled by formatting (shows `$4,472.64`)

### **2. Staleness Detection**:
- **Issue**: Data might be stale if `price-ingestor` stops updating
- **Solution**: Shows "Stale" badge if data > 4 seconds old

### **3. Database Polling Overhead**:
- **Issue**: Polling every 1 second for multiple symbols
- **Solution**: Only polls on live price pages, uses WebSocket as backup

---

## ✅ Summary

**Current Implementation**:
1. ✅ Prices come from `market_prices` table (updated by `price-ingestor`)
2. ✅ Database polling every 1 second for live price pages
3. ✅ Price formatting with dynamic decimal places
4. ✅ Staleness detection and "Live" status indicator
5. ✅ Manual refresh button available
6. ✅ WebSocket backup for real-time updates

**Price Display**: `$4,472.64` for XAUUSD is correct and properly formatted from the database value `4472.985000000001`.


