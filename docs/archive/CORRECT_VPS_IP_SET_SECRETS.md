# ✅ CORRECT VPS IP Address - Set Secrets

## ✅ Correct IP Address Confirmed
- **Correct IP**: `209.222.12.247` ✅
- **Incorrect IP**: `45.32.89.134` ❌ (deleted, not working)

---

## 🔧 Set Secrets with CORRECT IP

### Commands to Run:

```bash
# Set VPS Service URL with CORRECT IP
supabase secrets set VPS_MT5_SERVICE_URL="http://209.222.12.247:3001" --project-ref kmuoqkcxguafxulqlbmi

# Set VPS API Key
supabase secrets set VPS_API_KEY="bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d" --project-ref kmuoqkcxguafxulqlbmi
```

---

## 📋 Correct Values Summary

| Secret Name | Value | Notes |
|------------|-------|-------|
| `VPS_MT5_SERVICE_URL` | `http://209.222.12.247:3001` | ✅ Correct IP (209.222.12.247) |
| `VPS_API_KEY` | `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d` | From setup script |

---

## 🔍 Verify VPS Service is Running (with correct IP)

```bash
curl http://209.222.12.247:3001/terminals/stats -H "X-API-Key: bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d"
```

---

## ✅ Changes Made

1. ✅ Updated Edge Function default URL to correct IP
2. ✅ Updated all documentation files
3. ✅ Ready to set secrets with correct IP

---

**Set the secrets with the CORRECT IP address (209.222.12.247) to fix the error!**
