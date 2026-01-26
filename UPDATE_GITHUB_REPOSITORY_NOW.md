# 🚨 URGENT: Update GitHub Repository with NEW Architecture

## Current Status

❌ **GitHub repository has OLD architecture:**
- Uses TraderMade WebSocket
- Calls Edge Function via axios
- 1 second batch interval
- Wrong dependencies

✅ **Frontend is already fixed** (code changes applied)

## Action Required

You need to update the GitHub repository with the NEW architecture code.

---

## Step-by-Step Instructions

### Step 1: Access GitHub Repository
1. Go to: https://github.com/Imperial-Trade/imperial-trade-ingress-worker
2. Make sure you're on the `main` branch

### Step 2: Update index.js
1. Click on `index.js` file
2. Click the **pencil icon** (Edit) in the top right
3. **Delete ALL existing code**
4. **Copy and paste** the NEW code from `GITHUB_WORKER_NEW_INDEX_JS.md`
5. Scroll down and click **"Commit changes"**
6. Commit message: `feat: migrate to MetaApi with direct RPC writes (500ms interval)`
7. Click **"Commit changes"** button

### Step 3: Update package.json
1. Click on `package.json` file
2. Click the **pencil icon** (Edit)
3. **Replace** with this content:

```json
{
  "name": "imperial-ingress-worker",
  "version": "2.0.0",
  "description": "High-frequency MetaApi to Supabase price ingestor (2 updates/second)",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node index.js"
  },
  "dependencies": {
    "metaapi.cloud-sdk": "^21.0.0",
    "@supabase/supabase-js": "^2.39.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

4. Commit message: `chore: update dependencies for MetaApi architecture`
5. Click **"Commit changes"**

### Step 4: Verify Environment Variables (DigitalOcean)
1. Go to DigitalOcean Dashboard
2. Navigate to your App → Settings → Variables
3. Verify these 4 variables are set:
   - ✅ `META_API_TOKEN`
   - ✅ `META_API_ACCOUNT_ID = 4158f3d7-08b5-4e23-9202-18ef753aabe1`
   - ✅ `SUPABASE_URL = https://kmuoqkcxguafxulqlbmi.supabase.co`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY`

### Step 5: Deploy
1. DigitalOcean will auto-deploy after GitHub push (usually 2-3 minutes)
2. OR manually trigger deployment in DigitalOcean dashboard
3. Check Runtime Logs to verify worker starts

---

## What Changed: OLD → NEW

### OLD Architecture (Current in GitHub):
```
TraderMade WebSocket → axios.post → Edge Function → Database
Interval: 1000ms (1 second)
Dependencies: WebSocket, axios
```

### NEW Architecture (Required):
```
MetaApi SDK → supabase.rpc() → Database (direct)
Interval: 500ms (0.5 seconds = 2 updates/second)
Dependencies: metaapi.cloud-sdk, @supabase/supabase-js
```

---

## Files to Update

1. ✅ **index.js** - Replace with NEW MetaApi code
2. ✅ **package.json** - Update dependencies
3. ✅ **Environment Variables** - Verify in DigitalOcean

---

## After Update

Once GitHub is updated and DigitalOcean deploys:

1. ✅ Check DigitalOcean Runtime Logs
2. ✅ Verify worker connects to MetaApi
3. ✅ Verify prices writing to `market_prices` table
4. ✅ Verify frontend displays live prices (already fixed)

---

## Quick Reference

**NEW index.js code:** See `GITHUB_WORKER_NEW_INDEX_JS.md`
**NEW package.json:** See above or `GITHUB_WORKER_NEW_INDEX_JS.md`
**Frontend changes:** Already applied ✅

---

## Status Checklist

- [ ] GitHub `index.js` updated with NEW code
- [ ] GitHub `package.json` updated with NEW dependencies
- [ ] Environment variables verified in DigitalOcean
- [ ] DigitalOcean worker deployed
- [ ] Worker running successfully (check logs)
- [ ] Live prices displaying in frontend
