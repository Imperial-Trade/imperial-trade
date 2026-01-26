# 🔍 Edge Function Secret Reading Issue - Explained

## What Does "Blocked by Secret Reading" Mean?

The Edge Function **cannot read the secrets** it needs to connect to the VPS service. Let me show you exactly what's happening:

---

## 📋 The Problem

### Step 1: Edge Function Tries to Read Secrets

When the Edge Function starts, it tries to read two secrets from Supabase:

```typescript
// Line 16-17 in test-broker-connection/index.ts
const VPS_MT5_SERVICE_URL = Deno.env.get('VPS_MT5_SERVICE_URL')
const VPS_API_KEY = Deno.env.get('VPS_API_KEY')
```

**Expected:** These should contain:
- `VPS_MT5_SERVICE_URL` = `http://45.32.89.134:3001`
- `VPS_API_KEY` = `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

**Actual:** These are returning `undefined` or `null`

---

### Step 2: Edge Function Checks if Secrets Exist

```typescript
// Line 108 in test-broker-connection/index.ts
if (VPS_MT5_SERVICE_URL) {
  // ✅ This block runs if secret is found
  // Try to connect to VPS...
} else {
  // ❌ This block runs if secret is NOT found
  // Skip VPS connection...
}
```

**What's happening:** The condition `if (VPS_MT5_SERVICE_URL)` evaluates to `false` because the secret is not being read.

---

### Step 3: Edge Function Falls Back to "Validation-Only" Mode

When secrets are not found, the Edge Function skips the VPS connection and returns an error:

```typescript
// Lines 258-276 in test-broker-connection/index.ts
console.log('⚠️ VPS not configured - using validation-only mode')

return new Response(
  JSON.stringify({
    success: false,
    connected: false,
    validation_only: true,
    error: 'VPS service not configured. Please configure VPS_MT5_SERVICE_URL and VPS_API_KEY in Supabase Edge Function secrets.',
  }),
  { status: 400, ... }
)
```

**Result:** The frontend receives a 400 error saying "Connection test failed"

---

## 🔍 Why This Happens

### Possible Reasons:

1. **Secrets Not Set in Supabase Dashboard**
   - The secrets haven't been added to the Supabase project
   - Location: Settings → Vault → Secrets

2. **Wrong Secret Names**
   - Secrets must be named EXACTLY:
     - `VPS_MT5_SERVICE_URL` (not `vps_mt5_service_url` or `VpsMt5ServiceUrl`)
     - `VPS_API_KEY` (not `vps_api_key` or `VpsApiKey`)
   - Secret names are **case-sensitive**

3. **Secrets Not Propagated**
   - After adding secrets, Edge Functions may need to be redeployed
   - Or there's a delay in propagation

4. **Secrets Set in Wrong Place**
   - Secrets must be in **Edge Function secrets**, not environment variables
   - Location: Supabase Dashboard → Settings → Vault → Secrets

---

## 📊 What the Edge Function Logs Show

When the Edge Function starts, it logs:

```javascript
// Line 20-26 in test-broker-connection/index.ts
console.log('🔧 Edge Function initialized:', {
  vps_url_set: !!VPS_MT5_SERVICE_URL,           // Should be: true
  vps_url_length: VPS_MT5_SERVICE_URL?.length || 0,  // Should be: 29
  vps_api_key_set: !!VPS_API_KEY,               // Should be: true
  vps_api_key_length: VPS_API_KEY?.length || 0,      // Should be: 64
  all_env_keys: Object.keys(Deno.env.toObject()).filter(k => k.includes('VPS'))
})
```

**Current State (if secrets not found):**
```
🔧 Edge Function initialized: {
  vps_url_set: false,        // ❌ Secret not found
  vps_url_length: 0,         // ❌ No value
  vps_api_key_set: false,    // ❌ Secret not found
  vps_api_key_length: 0,     // ❌ No value
  all_env_keys: []           // ❌ No VPS keys found
}
```

**Expected State (if secrets found):**
```
🔧 Edge Function initialized: {
  vps_url_set: true,         // ✅ Secret found
  vps_url_length: 29,        // ✅ Value length
  vps_api_key_set: true,     // ✅ Secret found
  vps_api_key_length: 64,    // ✅ Value length
  all_env_keys: ['VPS_MT5_SERVICE_URL', 'VPS_API_KEY']  // ✅ Keys found
}
```

---

## ✅ How to Fix It

### Step 1: Verify Secrets in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/settings/vault
2. Look for these secrets:
   - `VPS_MT5_SERVICE_URL`
   - `VPS_API_KEY`
3. If they don't exist, add them with these EXACT names

### Step 2: Add/Update Secrets

If secrets are missing or wrong:

1. Click "Add Secret" or edit existing
2. Name: `VPS_MT5_SERVICE_URL`
   - Value: `http://45.32.89.134:3001`
3. Name: `VPS_API_KEY`
   - Value: `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

### Step 3: Redeploy Edge Function

After adding/updating secrets:

```bash
supabase functions deploy test-broker-connection --project-ref kmuoqkcxguafxulqlbmi
```

### Step 4: Test Connection

After redeployment, test from frontend and check Edge Function logs to verify secrets are being read.

---

## 🎯 Summary

**"Blocked by secret reading"** means:

1. ✅ Edge Function code is correct
2. ✅ VPS service is ready
3. ❌ Edge Function cannot read `VPS_MT5_SERVICE_URL` from Supabase secrets
4. ❌ Edge Function skips VPS connection and returns error
5. ❌ Frontend shows "Connection test failed"

**The fix:** Add/verify secrets in Supabase Dashboard and redeploy Edge Function.

---

## 🔍 How to Verify Secrets Are Being Read

After redeployment, check Edge Function logs:

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/logs/explorer
2. Filter for: `test-broker-connection`
3. Look for startup log: `🔧 Edge Function initialized:`
4. Check if `vps_url_set: true` and `vps_api_key_set: true`

If both are `true`, secrets are working! ✅







