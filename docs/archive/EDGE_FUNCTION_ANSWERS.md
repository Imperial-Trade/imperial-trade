# Edge Function Configuration - Answers

## 1. Are these the correct Edge Functions?

**YES** ✅

- **Edge Function**: `sync-broker-trades` 
- **Purpose**: Calls VPS service to fetch trades from MT5
- **Architecture**: Frontend → Edge Function → VPS Service → MT5 → Database
- **Location**: `supabase/functions/sync-broker-trades/index.ts`

This is the correct Edge Function for your broker sync system.

---

## 2. Where do we get VPS_MT5_SERVICE_URL and VPS_API_KEY?

### **VPS_MT5_SERVICE_URL:**
- **Value**: `http://209.222.12.247:3001`
- **What it is**: URL of your VPS Node.js service (vps-broker-service)
- **Where to set**: Supabase Edge Function secret
- **Default in code**: Already set as fallback, but should be set as secret

### **VPS_API_KEY:**
- **Value**: `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`
- **What it is**: API key for authenticating Edge Function → VPS service calls
- **Where it comes from**: Generated in `vps-broker-service/setup-complete.ps1`
- **Where to set**: 
  1. Supabase Edge Function secret (`VPS_API_KEY`)
  2. VPS `.env` file (`VPS_API_KEY`) - should already be set
- **Must match**: The key in Supabase must match the key on the VPS

---

## 🔧 How to Set in Supabase

```bash
supabase secrets set VPS_MT5_SERVICE_URL="http://209.222.12.247:3001" --project-ref kmuoqkcxguafxulqlbmi
supabase secrets set VPS_API_KEY="bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d" --project-ref kmuoqkcxguafxulqlbmi
```

---

## ⚠️ Current Error Cause

Your error "Edge Function returned a non-2xx status code" is likely because these secrets are **NOT SET** in Supabase.

The Edge Function returns a 500 error if these secrets are missing:
```
"VPS service not configured. Missing VPS_MT5_SERVICE_URL or VPS_API_KEY in Supabase Edge Function secrets."
```

---

**Action Required**: Set both secrets in Supabase to fix the error!
