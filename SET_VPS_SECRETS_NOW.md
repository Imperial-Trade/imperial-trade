# ⚠️ CRITICAL: Set VPS Secrets in Supabase

## The Problem

Your error "Edge Function returned a non-2xx status code" is likely because **VPS_MT5_SERVICE_URL** and **VPS_API_KEY** are NOT set in Supabase Edge Function secrets.

The Edge Function checks for these and returns a 500 error if missing:
```typescript
if (!VPS_MT5_SERVICE_URL || !VPS_API_KEY) {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'VPS service not configured. Missing VPS_MT5_SERVICE_URL or VPS_API_KEY in Supabase Edge Function secrets.'
    }),
    { status: 500 }
  )
}
```

---

## ✅ Solution: Set These Secrets

### Command to Run:

```bash
# Set VPS Service URL (CORRECT IP: 209.222.12.247)
supabase secrets set VPS_MT5_SERVICE_URL="http://209.222.12.247:3001" --project-ref kmuoqkcxguafxulqlbmi

# Set VPS API Key (from your setup script)
supabase secrets set VPS_API_KEY="bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d" --project-ref kmuoqkcxguafxulqlbmi
```

---

## 📋 Values Summary

| Secret Name | Value | Source |
|------------|-------|--------|
| `VPS_MT5_SERVICE_URL` | `http://209.222.12.247:3001` | VPS IP:port (Node.js service) |
| `VPS_API_KEY` | `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d` | Generated in setup script |

---

## 🔍 Verify VPS Service is Running

Before setting secrets, verify the VPS service is accessible:

```bash
curl http://209.222.12.247:3001/terminals/stats -H "X-API-Key: bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d"
```

If this works, the VPS service is running and the API key is correct.

---

## ✅ After Setting Secrets

1. The Edge Function will be able to call the VPS service
2. Trade sync should work
3. Trades will appear in the "Trades" section

---

**Set these secrets NOW to fix the error!**
