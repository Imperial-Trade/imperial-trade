# ✅ MetaAPI Live Price Setup - Complete Guide

## 🎯 **Current Status**

You've paid for MetaAPI - now let's make sure live prices are working!

---

## 📋 **What You Have**

✅ **Worker Code:** `index.js` (MetaAPI price ingestor)  
✅ **Frontend:** Already configured to read from `market_prices` table  
✅ **Database:** `upsert_market_price_enhanced` RPC function ready  

**What's Needed:** Deploy the worker to DigitalOcean with MetaAPI credentials

---

## 🚀 **Step 1: Get Your MetaAPI Credentials**

### **1.1: Get MetaAPI Token**

1. Go to: https://app.metaapi.cloud/
2. Login to your account
3. Navigate to: **Settings** → **API Tokens**
4. **Copy your token** (it's a long string)

### **1.2: Get Account ID**

1. In MetaAPI dashboard, go to: **Accounts**
2. **Find your account** (should show "CONNECTED" status)
3. **Copy the Account ID** (UUID format like: `4158f3d7-08b5-4e23-9202-18ef753aabe1`)

### **1.3: Verify Account Status**

Make sure your account shows:
- ✅ **Status:** CONNECTED
- ✅ **State:** DEPLOYED
- ✅ **Connection Status:** CONNECTED

If not connected:
- Click "Deploy" button
- Wait for deployment (1-2 minutes)
- Wait for connection (1-2 minutes)

---

## 🔧 **Step 2: Deploy Worker to DigitalOcean**

### **Option A: Create New Worker App**

1. **Go to:** https://cloud.digitalocean.com/apps
2. **Click:** "Create App"
3. **Choose:** "GitHub" (connect your repository)
4. **Select Repository:** `imperial-trade`
5. **Configure:**
   - **Type:** Worker
   - **Source Directory:** `/` (root)
   - **Build Command:** (leave empty)
   - **Run Command:** `node index.js`
6. **Add Environment Variables:**
   ```
   META_API_TOKEN=your_token_here
   META_API_ACCOUNT_ID=your_account_id_here
   SUPABASE_URL=https://kmuoqkcxguafxulqlbmi.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
7. **Deploy**

### **Option B: Add Worker to Existing App**

1. **Go to:** Your existing DigitalOcean App
2. **Settings** → **Components**
3. **Add Component** → **Worker**
4. **Configure:**
   - **Source:** Same repo
   - **Run Command:** `node index.js`
5. **Add Environment Variables** (same as above)
6. **Deploy**

---

## 📦 **Step 3: Create Worker package.json**

The worker needs its own `package.json` for DigitalOcean. Create this file:

**File:** `worker-package.json` (in root directory)

```json
{
  "name": "metaapi-price-worker",
  "version": "1.0.0",
  "type": "commonjs",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "metaapi.cloud-sdk": "^24.0.0",
    "@supabase/supabase-js": "^2.50.3"
  }
}
```

**Then rename it for DigitalOcean:**
- DigitalOcean looks for `package.json` in the worker directory
- Or set **Build Command:** `cd . && npm install` in DO settings

---

## ✅ **Step 4: Verify It's Working**

### **4.1: Check DigitalOcean Logs**

1. Go to: DigitalOcean App → **Runtime Logs**
2. **Look for:**
   ```
   ✅ Account is connected
   ✅ Subscribed to XAUUSD
   ✅ Subscribed to BTCUSD
   ✅ Synced 5 prices to Supabase
   ```

### **4.2: Check Supabase Database**

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi
2. **Table Editor** → `market_prices`
3. **Check:**
   - Prices should update every 500ms
   - Should see: XAUUSD, BTCUSD, U30USD, SPXUSD, NDXUSD
   - `updated_at` should be recent (< 1 second old)

### **4.3: Test in Frontend**

1. **Open your app**
2. **Go to Signal Stream**
3. **Create test signal:** XAUUSD
4. **Check live price displays** and updates

---

## 🔍 **Quick Verification Script**

Run this locally to check if prices are updating:

```bash
# Install dependencies first
npm install @supabase/supabase-js

# Run check script
node check-live-prices.js
```

**Expected Output:**
```
✅ XAUUSD  | Mid: 2650.50    | Age: 2s
✅ BTCUSD  | Mid: 43250.00   | Age: 2s
✅ LIVE PRICES ARE WORKING!
```

---

## 🆘 **Troubleshooting**

### **Issue: Worker won't start**

**Check:**
- ✅ All environment variables set
- ✅ MetaAPI token is valid
- ✅ Account ID is correct
- ✅ Account is CONNECTED in MetaAPI dashboard

### **Issue: "Account not deployed"**

**Fix:**
1. Go to MetaAPI dashboard
2. Click "Deploy" on your account
3. Wait 1-2 minutes
4. Check status shows "CONNECTED"

### **Issue: "Failed to subscribe to symbols"**

**Check:**
- ✅ Account is connected to broker
- ✅ Symbols are available on your broker
- ✅ Account has market data access

### **Issue: Prices not updating in database**

**Check:**
- ✅ Worker logs show "Synced X prices"
- ✅ Supabase RPC function exists: `upsert_market_price_enhanced`
- ✅ Service role key has write permissions

---

## 📊 **What Should Happen**

### **Worker Flow:**
1. ✅ Connects to MetaAPI
2. ✅ Deploys/connects account
3. ✅ Subscribes to 5 symbols
4. ✅ Receives price ticks
5. ✅ Writes to Supabase every 500ms

### **Frontend Flow:**
1. ✅ Reads from `market_prices` table
2. ✅ Polls every 500ms
3. ✅ Displays live prices
4. ✅ Updates UI in real-time

---

## 🎯 **Next Steps**

1. ✅ **Deploy worker** to DigitalOcean
2. ✅ **Set environment variables**
3. ✅ **Verify prices** in Supabase
4. ✅ **Test in frontend**

**Ready to deploy?** Follow Step 2 above!

---

## 📝 **Environment Variables Checklist**

Make sure these are set in DigitalOcean:

- [ ] `META_API_TOKEN` - Your MetaAPI token
- [ ] `META_API_ACCOUNT_ID` - Your account UUID
- [ ] `SUPABASE_URL` - `https://kmuoqkcxguafxulqlbmi.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Your service role key

**All set?** Deploy and check logs! 🚀
