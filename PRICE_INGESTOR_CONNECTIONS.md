# Price-Ingestor Function - Complete Connection Map

## 🔗 What's Linked to `price-ingestor` Edge Function

### **1. Data Sources (Who Sends Data TO price-ingestor)**

#### **A. VPS Price Feeder (Primary Source)**
- **Location**: `C:\imperial-price-feeder` on Vultr VPS
- **Service Name**: "Imperial Price Feeder" (PM2)
- **Source**: EC Markets MT5 Terminal
- **How it works**:
  - Connects to MT5 running on VPS
  - Fetches live prices from MT5
  - Sends prices to `price-ingestor` via HTTP POST
  - Uses `X-INGEST-KEY` header with `INGEST_SECRET` for authentication
  - Sends data in format: `{ prices: [{ symbol, price, timestamp }] }`

#### **B. Supabase CRON Job (Secondary/Backup)**
- **Migration**: `20250924002145_5dfb9eaa-1cdb-48cf-8320-20ad9f89323d.sql`
- **Job Name**: `price-ingestor-v4-realtime`
- **Schedule**: Every 2 seconds (`*/2 * * * * *`)
- **Purpose**: Backup trigger (though primary source is VPS)
- **Note**: This CRON job sends empty/placeholder requests

#### **C. Test/Development Sources**
- **Test Script**: `test-scripts/external-price-simulator.mjs`
  - Simulates external price feed
  - Tests complete pipeline
- **Frontend Test Components**:
  - `src/components/testing/ComprehensiveWebSocketTester.tsx`
  - `src/components/debug/TestPriceGenerator.tsx`
  - `src/components/testing/EndToEndTestSuite.tsx`

---

### **2. What price-ingestor Does (Processing)**

#### **A. Receives Price Data**
- **Endpoint**: `POST /functions/v1/price-ingestor`
- **Authentication**: `X-INGEST-KEY` header (must match `INGEST_SECRET`)
- **Payload Format**:
  ```json
  {
    "prices": [
      {
        "symbol": "EURUSD",
        "price": 1.0850,
        "timestamp": "2024-01-01T12:00:00Z"
      }
    ]
  }
  ```

#### **B. Processes Prices (Background)**
1. **Alert Processing** (Priority 1):
   - Checks `trade_alerts` table for active alerts
   - Detects Stop Loss hits (priority)
   - Detects Take Profit hits (sequential)
   - Updates `trade_alerts` table with hit status
   - Triggers database notifications (via triggers)

2. **Database Upsert** (Priority 2):
   - Upserts ALL prices to `market_prices` table
   - Uses `upsert_market_price_enhanced` RPC function
   - Stores: `symbol`, `bid`, `ask`, `mid`, `timestamp`

3. **UI Broadcast** (Priority 3):
   - Broadcasts significant price changes to WebSocket
   - Filters prices based on change thresholds:
     - 0.01% for non-gold assets
     - 0.1 pips for gold assets
   - Rate-limited to 5Hz per symbol
   - Only broadcasts if active users are connected

---

### **3. Database Tables (What price-ingestor Reads/Writes)**

#### **Reads From:**
- `trade_alerts` - Active alerts to check for TP/SL hits
- `ui_price_listeners` - Active user sessions (for broadcast optimization)

#### **Writes To:**
- `market_prices` - Price data storage (via `upsert_market_price_enhanced` RPC)
- `trade_alerts` - Updates `tp_hits`, `sl_hit`, `status` columns

#### **Triggers (Indirect Writes):**
- Database triggers on `trade_alerts` updates → Send notifications
- These triggers call notification functions automatically

---

### **4. Downstream Systems (What Uses price-ingestor Output)**

#### **A. Frontend WebSocket Clients**
- **Component**: `src/contexts/OptimizedWebSocketPriceContext.tsx`
- **How**: Subscribes to Supabase Realtime channel `price_updates`
- **Receives**: Filtered price updates broadcast by `price-ingestor`
- **Displays**: Live prices in UI

#### **B. Notification System**
- **Trigger**: Database triggers on `trade_alerts` updates
- **Functions Called**:
  - `notify-tp-hit`
  - `notify-stop-loss-hit`
  - `notify-limit-activated`
  - `notify-signal-closed`
- **Flow**: `price-ingestor` updates `trade_alerts` → Trigger fires → Notification sent

#### **C. Alert Monitoring**
- **Table**: `trade_alerts`
- **Status Updates**: `price-ingestor` marks alerts as hit/closed
- **Used By**: Frontend to show alert status

---

### **5. Configuration & Secrets**

#### **Environment Variables (Supabase Edge Function)**
- `INGEST_SECRET` - Authentication key (must match VPS)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for DB access
- `EMERGENCY_DISABLE_BROADCASTS` - Emergency kill switch (optional)

#### **VPS Configuration**
- `.env` file in `C:\imperial-price-feeder`:
  - `SUPABASE_URL`
  - `INGEST_SECRET` (must match Supabase secret)
  - `SUPABASE_FUNCTION_URL` (price-ingestor endpoint)

---

### **6. Database Functions Used**

#### **RPC Functions Called by price-ingestor:**
- `upsert_market_price_enhanced(p_symbol, p_bid, p_ask, p_mid, p_timestamp)`
  - Upserts price data to `market_prices` table

#### **Database Triggers:**
- Triggers on `trade_alerts` table updates
- Automatically call notification functions when alerts are hit

---

### **7. Monitoring & Health Checks**

#### **Health Check Function**
- **File**: `src/utils/priceIngestorHealthCheck.ts`
- **Component**: `OptimizedWebSocketPriceContext.tsx` (line 1147)
- **Purpose**: Checks if price-ingestor is responding

#### **Logs**
- Supabase Edge Function logs
- VPS PM2 logs: `pm2 logs "Imperial Price Feeder"`

---

## 📊 Complete Data Flow

```
┌─────────────────┐
│  EC Markets MT5 │
│   (VPS)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Imperial Price  │
│ Feeder (VPS)    │
│ (PM2 Service)   │
└────────┬────────┘
         │ HTTP POST
         │ X-INGEST-KEY
         ▼
┌─────────────────┐
│ price-ingestor  │
│ Edge Function   │
└────────┬────────┘
         │
         ├──► Process Alerts ──► trade_alerts table
         │                        │
         │                        ▼
         │                    Database Triggers
         │                        │
         │                        ▼
         │                    Notification Functions
         │
         ├──► Upsert Prices ──► market_prices table
         │
         └──► Broadcast ──► Supabase Realtime ──► Frontend WebSocket
```

---

## 🔑 Key Connections Summary

| Component | Connection Type | Purpose |
|-----------|----------------|---------|
| **VPS Price Feeder** | HTTP POST → price-ingestor | Primary price data source |
| **Supabase CRON** | HTTP POST → price-ingestor | Backup/placeholder trigger |
| **price-ingestor** | RPC → `upsert_market_price_enhanced` | Save prices to DB |
| **price-ingestor** | SQL UPDATE → `trade_alerts` | Mark alerts as hit |
| **Database Triggers** | Auto → Notification functions | Send notifications |
| **price-ingestor** | Supabase Realtime → Frontend | Broadcast price updates |

---

## 🚨 Critical Dependencies

1. **VPS Price Feeder MUST be running** - Primary data source
2. **MT5 Terminal MUST be running** - Price source for feeder
3. **INGEST_SECRET must match** - Between VPS and Supabase
4. **Database triggers must exist** - For notifications to work
5. **Supabase Realtime enabled** - For frontend price updates

---

## 📝 Notes

- The CRON job in Supabase is a backup/placeholder - primary source is VPS
- `price-ingestor` uses `EdgeRuntime.waitUntil()` for background processing
- Prices are ALWAYS saved to DB, but UI broadcasts are rate-limited
- Alert processing happens BEFORE price upsert (priority system)
- Stop Loss detection has priority over Take Profit detection


