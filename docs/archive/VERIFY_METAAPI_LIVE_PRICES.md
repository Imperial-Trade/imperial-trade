# ✅ MetaAPI Live Price Verification & Setup

## 🎯 **Quick Status Check**

Since you just paid for MetaAPI, let's verify everything is working!

---

## 📋 **Step 1: Verify DigitalOcean Worker is Running**

The live price system uses a **DigitalOcean Worker** that:
- Connects to MetaAPI
- Streams live prices (XAUUSD, BTCUSD, U30USD, SPXUSD, NDXUSD)
- Writes to Supabase `market_prices` table every 500ms

### **Check Worker Status:**

1. **Go to DigitalOcean Dashboard**
2. **Navigate to:** Apps → Your App → Runtime Logs
3. **Look for:**
   - `✅ Account is connected`
   - `✅ Subscribed to XAUUSD`
   - `✅ Synced X prices to Supabase`

### **If Worker is NOT Running:**

The worker needs these environment variables in DigitalOcean:
- `META_API_TOKEN` - Your MetaAPI token
- `META_API_ACCOUNT_ID` - Your MetaAPI account ID
- `SUPABASE_URL` - `https://kmuoqkcxguafxulqlbmi.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key

---

## 📊 **Step 2: Check Live Prices in Database**

### **Via Supabase Dashboard:**

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi
2. Navigate to: **Table Editor** → `market_prices`
3. **Check:**
   - Are there recent prices? (updated_at should be < 1 minute ago)
   - Do you see: XAUUSD, BTCUSD, U30USD, SPXUSD, NDXUSD?
   - Are prices updating?

### **Expected Result:**
```
symbol  | mid      | updated_at (should be recent)
--------|----------|-----------------------------
XAUUSD  | 2650.50  | 2025-01-15 20:05:23 (just now)
BTCUSD  | 43250.00 | 2025-01-15 20:05:23 (just now)
U30USD  | 38500.00 | 2025-01-15 20:05:23 (just now)
SPXUSD  | 4780.00  | 2025-01-15 20:05:23 (just now)
NDXUSD  | 16800.00 | 2025-01-15 20:05:23 (just now)
```

---

## 🔧 **Step 3: Verify MetaAPI Credentials**

### **Get Your MetaAPI Token:**

1. Go to: https://app.metaapi.cloud/
2. Navigate to: **Settings** → **API Tokens**
3. **Copy your token** (starts with something like `...`)

### **Get Your Account ID:**

1. Go to: https://app.metaapi.cloud/
2. Navigate to: **Accounts**
3. **Copy your account ID** (UUID format)

### **Set in DigitalOcean:**

1. Go to: DigitalOcean Dashboard → Your App
2. Navigate to: **Settings** → **App-Level Environment Variables**
3. **Add/Verify:**
   ```
   META_API_TOKEN=your_token_here
   META_API_ACCOUNT_ID=your_account_id_here
   SUPABASE_URL=https://kmuoqkcxguafxulqlbmi.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
4. **Save** and **Redeploy** the worker

---

## 🚀 **Step 4: Deploy/Start the Worker**

### **If Worker File Exists (`index.js`):**

The worker code is in your repository at: `index.js`

### **Deploy to DigitalOcean:**

1. **Option A: Via DigitalOcean Dashboard**
   - Go to Apps → Create App (or edit existing)
   - Connect to GitHub repository
   - Set build command: (none needed for worker)
   - Set run command: `node index.js`
   - Add environment variables (Step 3)
   - Deploy

2. **Option B: Via DigitalOcean CLI**
   ```bash
   doctl apps create --spec .do/app.yaml
   ```

---

## ✅ **Step 5: Verify Live Prices are Working**

### **Test in Frontend:**

1. **Open your app**
2. **Go to Signal Stream**
3. **Create a test signal** with symbol: `XAUUSD`
4. **Check if live price displays:**
   - Should show current Gold price
   - Should update every 500ms
   - Should show "Live" status

### **Check Console (Browser DevTools):**

Open browser console (F12) and look for:
```
📊 [Database Poll] Fetched prices for: XAUUSD
✅ [useOptimizedLivePrice] Price updated: 2650.50
```

---

## 🔍 **Troubleshooting**

### **Issue: No prices in database**

**Check:**
1. ✅ Worker is running (check DigitalOcean logs)
2. ✅ MetaAPI token is valid
3. ✅ Account ID is correct
4. ✅ Account is connected in MetaAPI dashboard
5. ✅ Supabase credentials are correct

### **Issue: Prices not updating**

**Check:**
1. ✅ Worker logs show "Synced X prices"
2. ✅ Database `updated_at` is recent
3. ✅ No errors in DigitalOcean logs

### **Issue: Frontend not showing prices**

**Check:**
1. ✅ Database has recent prices
2. ✅ Browser console shows price updates
3. ✅ Symbol matches (XAUUSD, not GOLD)

---

## 📝 **Quick Verification SQL**

Run this in Supabase SQL Editor:

```sql
-- Check recent prices
SELECT 
  symbol,
  mid,
  bid,
  ask,
  updated_at,
  NOW() - updated_at as age
FROM market_prices
ORDER BY updated_at DESC
LIMIT 10;

-- Check if prices are updating (should be < 10 seconds old)
SELECT 
  COUNT(*) as recent_prices,
  MAX(updated_at) as latest_update,
  NOW() - MAX(updated_at) as age
FROM market_prices
WHERE updated_at > NOW() - INTERVAL '1 minute';
```

**Expected:**
- `recent_prices` > 0
- `age` < 10 seconds
- Symbols: XAUUSD, BTCUSD, U30USD, SPXUSD, NDXUSD

---

## 🎯 **What Should Be Working**

✅ **MetaAPI Worker:**
- Connects to MetaAPI account
- Subscribes to 5 symbols
- Receives price ticks
- Writes to Supabase every 500ms

✅ **Frontend:**
- Reads from `market_prices` table
- Displays live prices
- Updates every 500ms
- Shows "Live" status

✅ **TP/SL Detection:**
- Monitors active signals
- Detects when price hits TP/SL
- Triggers notifications

---

## 🚨 **If Nothing Works**

1. **Check DigitalOcean Worker Logs** - Look for errors
2. **Verify MetaAPI Account Status** - Should be "CONNECTED"
3. **Test MetaAPI Connection** - Use MetaAPI dashboard
4. **Check Supabase RPC Function** - `upsert_market_price_enhanced` should exist

---

## 📞 **Next Steps**

1. ✅ Verify worker is deployed
2. ✅ Check environment variables
3. ✅ Test live prices in frontend
4. ✅ Monitor for 1 minute to see updates

**Ready to test?** Let me know what you see in the DigitalOcean logs or Supabase database!
