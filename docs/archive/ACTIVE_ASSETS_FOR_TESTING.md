# ⚠️ ACTIVE ASSETS FOR TESTING

**Date:** 2025-11-12  
**Status:** Live Price Monitoring Active

---

## 🎯 **ONLY 2 ASSETS HAVE ACTIVE LIVE PRICES:**

| Asset | Symbol | TradingView Symbol | Status |
|-------|--------|-------------------|--------|
| **Bitcoin** | `BITCOIN` | `BTCUSD` | ✅ ACTIVE |
| **Gold** | `XAUUSD` | `XAUUSD` | ✅ ACTIVE |

---

## ⚠️ **IMPORTANT FOR TESTING:**

When testing the notification system, **you MUST use either BITCOIN or XAUUSD** as the asset. These are the only two assets that:

1. ✅ Have active live price feeds from TradingView
2. ✅ Are monitored by the `price-ingestor` Edge Function
3. ✅ Will trigger TP/SL hit detection automatically

---

## 🧪 **CORRECT TEST SIGNAL EXAMPLES:**

### **Test Signal #1: Bitcoin BUY**

```sql
INSERT INTO public.trade_alerts (
  user_id,
  asset_name,
  trade_type,
  entry_price,
  stop_loss,
  tp1,
  tp2,
  tp3,
  tp4,
  tp5,
  tradermade_symbol,
  status
)
SELECT 
  id,
  'BITCOIN',           -- ✅ Use BITCOIN
  'buy',
  103000.00,           -- Entry
  102500.00,           -- SL (500 pips below)
  103500.00,           -- TP1 (500 pips above)
  104000.00,           -- TP2 (1000 pips above)
  104500.00,           -- TP3 (1500 pips above)
  105000.00,           -- TP4 (2000 pips above)
  105500.00,           -- TP5 (2500 pips above)
  'BTCUSD',            -- ✅ TradingView symbol
  'active'
FROM profiles
WHERE user_type = 'educator'
LIMIT 1;
```

**Expected Behavior:**
- ✅ Notification sent immediately on creation (`signal_created`)
- ✅ If live price hits TP levels → `tp_hit` notification
- ✅ If live price hits SL → `stop_loss_hit` notification

---

### **Test Signal #2: Gold SELL**

```sql
INSERT INTO public.trade_alerts (
  user_id,
  asset_name,
  trade_type,
  entry_price,
  stop_loss,
  tp1,
  tp2,
  tp3,
  tp4,
  tp5,
  tradermade_symbol,
  status
)
SELECT 
  id,
  'XAUUSD',            -- ✅ Use XAUUSD
  'sell',
  2670.00,             -- Entry
  2680.00,             -- SL (10 pips above for SELL)
  2660.00,             -- TP1 (10 pips below)
  2650.00,             -- TP2 (20 pips below)
  2640.00,             -- TP3 (30 pips below)
  2630.00,             -- TP4 (40 pips below)
  2620.00,             -- TP5 (50 pips below)
  'XAUUSD',            -- ✅ TradingView symbol
  'active'
FROM profiles
WHERE user_type = 'educator'
LIMIT 1;
```

**Expected Behavior:**
- ✅ Notification sent immediately on creation (`signal_created`)
- ✅ If live price hits TP levels → `tp_hit` notification
- ✅ If live price hits SL → `stop_loss_hit` notification

---

## ❌ **ASSETS THAT WON'T WORK FOR TESTING:**

These assets do NOT have active live price monitoring:

- ❌ GBPUSD
- ❌ EURUSD
- ❌ USDJPY
- ❌ BTCETH
- ❌ Any other forex pairs or crypto pairs

**Why they won't work:**
- No live price feed configured
- `price-ingestor` doesn't monitor them
- TP/SL hit detection won't trigger
- You'll only get the initial `signal_created` notification

---

## 🔍 **HOW TO VERIFY ACTIVE PRICE MONITORING:**

### **Check Current Live Prices:**
```sql
SELECT 
  symbol,
  price,
  timestamp,
  NOW() - timestamp AS age
FROM live_prices
WHERE symbol IN ('BTCUSD', 'XAUUSD')
ORDER BY timestamp DESC
LIMIT 10;
```

**Expected Result:**
- ✅ Recent timestamps (< 5 seconds old)
- ✅ Prices updating continuously
- ✅ Both BTCUSD and XAUUSD present

---

## 📊 **PRICE INGESTOR STATUS:**

The `price-ingestor` Edge Function runs every **5 seconds** via cron job:

```toml
[functions.price-ingestor]
verify_jwt = false

[functions.price-ingestor.cron]
schedule = "*/5 * * * * *"  # Every 5 seconds
```

**What it does:**
1. Fetches live prices from TradingView for BTCUSD and XAUUSD
2. Stores prices in `live_prices` table
3. Checks all active signals for TP/SL hits
4. Updates `trade_alerts` table when hits are detected
5. Triggers notifications via database triggers

---

## 🎯 **TESTING RECOMMENDATIONS:**

### **For Signal Creation Notifications:**
✅ **Use either BITCOIN or XAUUSD** - both will work

### **For TP/SL Hit Notifications:**
✅ **Use BITCOIN or XAUUSD with realistic prices:**
- Check current live price first
- Set entry price near current price
- Set TPs slightly above/below (for BUY/SELL)
- Set SL slightly below/above (for BUY/SELL)

### **Example: Create Signal with Current Price**
```sql
-- Step 1: Check current price
SELECT price FROM live_prices WHERE symbol = 'BTCUSD' ORDER BY timestamp DESC LIMIT 1;
-- Example result: 103245.67

-- Step 2: Create signal with realistic levels
INSERT INTO public.trade_alerts (
  user_id, asset_name, trade_type,
  entry_price, stop_loss, tp1, tp2, tp3, tp4, tp5,
  tradermade_symbol, status
)
SELECT 
  id, 'BITCOIN', 'buy',
  103245.67,  -- Current price
  103145.67,  -- SL: 100 pips below
  103345.67,  -- TP1: 100 pips above
  103445.67,  -- TP2: 200 pips above
  103545.67,  -- TP3: 300 pips above
  103645.67,  -- TP4: 400 pips above
  103745.67,  -- TP5: 500 pips above
  'BTCUSD', 'active'
FROM profiles
WHERE user_type = 'educator'
LIMIT 1;
```

---

## 📝 **QUICK REFERENCE:**

| Test Scenario | Asset to Use | Why |
|--------------|-------------|-----|
| Signal creation notification | BITCOIN or XAUUSD | Both work ✅ |
| TP hit notification | BITCOIN or XAUUSD | Only these have live prices ✅ |
| SL hit notification | BITCOIN or XAUUSD | Only these have live prices ✅ |
| Limit activation | BITCOIN or XAUUSD | Only these have live prices ✅ |
| Notes update notification | Any asset | Doesn't require live prices ✅ |
| Signal closed notification | Any asset | Doesn't require live prices ✅ |

---

**🎯 BOTTOM LINE:**  
**If you want to test TP/SL hit detection → Use BITCOIN or XAUUSD ONLY!**

**Last Updated:** 2025-11-12 09:05 UTC

