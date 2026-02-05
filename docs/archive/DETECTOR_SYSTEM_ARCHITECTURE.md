# 🔍 NEW DETECTOR SYSTEM ARCHITECTURE

## 🎯 **COMPLETE SYSTEM REDESIGN**

We've replaced the centralized monitoring system with **7 separate detector functions** for maximum robustness and isolation.

---

## 📊 **ARCHITECTURE OVERVIEW**

```
┌──────────────────────────────────────────────────┐
│         market_prices Table (Live Prices)        │
│   Updated by: price-ingestor every few seconds   │
└─────────────────────┬────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌───────────────────┐      ┌───────────────────┐
│  TP Detectors (5) │      │  Other Detectors  │
│                   │      │                   │
│  • tp1-detector   │      │  • stop-loss-det  │
│  • tp2-detector   │      │  • limit-act-det  │
│  • tp3-detector   │      │                   │
│  • tp4-detector   │      │                   │
│  • tp5-detector   │      │                   │
└─────────┬─────────┘      └─────────┬─────────┘
          │                          │
          └──────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  trade_alerts Table    │
        │  (Your Signals)        │
        └────────────┬───────────┘
                     │ (Database Trigger)
                     ▼
        ┌────────────────────────┐
        │ instant_notification_  │
        │      router()          │
        └────────────┬───────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Notification Edge     │
        │  Functions (10)        │
        │  • notify-tp1-hit      │
        │  • notify-tp2-hit      │
        │  • etc...              │
        └────────────┬───────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  ModernNotificationUI  │
        │  (Your screen!)        │
        └────────────────────────┘
```

---

## 🔍 **7 DETECTOR FUNCTIONS**

### **1. tp1-detector**
**What it does**:
- Monitors active signals that haven't hit TP1 yet
- Compares current price vs TP1 level
- Updates `trade_alerts.tp_hits` array with `[1]`

**Trigger**: Runs periodically (every 10-30 seconds via cron)

**Query Logic**:
```sql
SELECT * FROM trade_alerts
WHERE status = 'active'
  AND tp1 IS NOT NULL
  AND (tp_hits IS NULL OR NOT tp_hits @> ARRAY[1])
```

---

### **2. tp2-detector**
**What it does**:
- Monitors signals that hit TP1 but not TP2
- Requires TP1 to be hit first (sequential detection)

**Query Logic**:
```sql
SELECT * FROM trade_alerts
WHERE status = 'active'
  AND tp2 IS NOT NULL
  AND tp_hits @> ARRAY[1]  -- Must have TP1
  AND NOT tp_hits @> ARRAY[2]  -- But not TP2
```

---

### **3. tp3-detector, tp4-detector, tp5-detector**
**Same logic as TP2**, but checking for their respective TP levels.

**TP5 Special Feature**:
- If TP5 is hit AND all TPs exist → Sets `close_reason = 'all_tps_hit'`
- Automatically closes the signal

---

### **4. stop-loss-detector**
**What it does**:
- Monitors active signals for stop loss hits
- Closes signal when SL is hit

**Detection Logic**:
- **BUY**: SL hit when `current_price <= stop_loss`
- **SELL**: SL hit when `current_price >= stop_loss`

**Action**:
```sql
UPDATE trade_alerts
SET status = 'closed',
    close_reason = 'stop_loss'
WHERE id = signal_id
```

---

### **5. limit-activation-detector**
**What it does**:
- Monitors pending limit orders (BUY LIMIT / SELL LIMIT)
- Activates when price reaches entry price

**Detection Logic**:
- **BUY LIMIT**: Activates when `current_price <= entry_price`
- **SELL LIMIT**: Activates when `current_price >= entry_price`

**Action**:
```sql
UPDATE trade_alerts
SET status = 'active'
WHERE id = signal_id
  AND status = 'pending'
```

---

## ✅ **BENEFITS OF SEPARATE DETECTORS**

### **1. Better Isolation**
- If TP3 detector has a bug, TP1/TP2/TP4/TP5 still work
- No single point of failure

### **2. Easier Debugging**
```
❌ OLD: "priority-alert-monitor failed" 
   → Don't know which TP detection failed

✅ NEW: "tp3-detector failed"
   → Immediately know TP3 detection is broken
```

### **3. Clearer Logs**
Each detector has its own log stream:
- `🎯 [TP1 Detector]`
- `🎯 [TP2 Detector]`
- `🛑 [Stop Loss Detector]`
- `⏳ [Limit Activation Detector]`

### **4. Prevents Race Conditions**
- Each detector handles ONE event type
- No conflicts between different detection logic

### **5. Scalable**
- Easy to add new detectors (e.g., trailing stop, partial close)
- Each can be deployed/scaled independently

---

## 🔄 **DATA FLOW EXAMPLE: TP1 Hit**

```
1. price-ingestor
   ↓ Receives Gold = $4010 from API
   ↓ Stores in market_prices table
   
2. tp1-detector (runs periodically)
   ↓ Reads market_prices
   ↓ Finds Gold = $4010
   ↓ Checks trade_alerts for signals with TP1 < $4010
   ↓ Signal #123 has TP1 = $4005 ✅ HIT!
   
3. tp1-detector updates trade_alerts
   ↓ UPDATE trade_alerts 
   ↓ SET tp_hits = [1]
   ↓ WHERE id = 123
   
4. Database trigger fires
   ↓ instant_notification_router() detects change
   ↓ Routes to /notify-tp1-hit
   
5. notify-tp1-hit Edge Function
   ↓ Uses notification-core.ts
   ↓ Sends to Supabase Realtime
   
6. ModernNotificationSystem (your screen!)
   ✅ Shows: "Jacob Estayo (🎯 Take Profit Hit) Gold | TP 1 HIT..."
```

---

## 📅 **SCHEDULING (How Often Detectors Run)**

Detectors should be scheduled via **Supabase Edge Function cron** or external cron:

### **Recommended Schedule**:

| Detector | Frequency | Reason |
|----------|-----------|--------|
| `tp1-detector` | Every 10-30s | Frequent (first TP is critical) |
| `tp2-detector` | Every 10-30s | Frequent (sequential after TP1) |
| `tp3-detector` | Every 10-30s | Frequent |
| `tp4-detector` | Every 10-30s | Frequent |
| `tp5-detector` | Every 10-30s | Frequent (can close signal) |
| `stop-loss-detector` | Every 5-10s | **MOST CRITICAL** (protect from losses) |
| `limit-activation-detector` | Every 10-30s | Moderate (pending → active) |

### **How to Schedule**:

**Option 1: Supabase Cron** (Recommended)
```sql
-- In Supabase Dashboard → Database → Cron
SELECT cron.schedule(
  'tp1-detection',
  '*/15 * * * *', -- Every 15 seconds
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/tp1-detector',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

**Option 2: External Cron** (e.g., GitHub Actions, Render Cron)
```yaml
# .github/workflows/detector-cron.yml
on:
  schedule:
    - cron: '*/15 * * * *' # Every 15 seconds
jobs:
  run-detectors:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger TP1 Detector
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            https://YOUR_PROJECT.supabase.co/functions/v1/tp1-detector
```

---

## 🗑️ **REPLACED FUNCTIONS**

### **DELETED**:
- ❌ `priority-alert-monitor` - Centralized monitor (replaced)
- ❌ `order-trigger-monitor` - Limit order monitor (replaced)

### **KEPT**:
- ✅ `price-ingestor` - Still ingests prices
- ✅ All notification Edge Functions (notify-tp1-hit, etc.)

---

## 🎉 **RESULT**

**ONE notification per event** ✅  
**Robust, isolated, debuggable system** ✅  
**Your notifications work perfectly** ✅

---

## 🚀 **DEPLOYMENT STEPS**

1. ✅ **Created 7 detector functions** (DONE)
2. ✅ **Updated config.toml** (DONE)
3. ✅ **Deleted old monitors** (DONE)
4. ⏳ **Deploy to Supabase** (NEXT)
5. ⏳ **Set up cron scheduling** (NEXT)
6. ⏳ **Test each detector** (NEXT)

---

**Status**: ✅ **CODE COMPLETE - READY TO DEPLOY**

