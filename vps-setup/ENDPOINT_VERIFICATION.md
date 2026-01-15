# Endpoint Verification and Deployment Guide

## 🔍 Endpoint Configuration

### VPS MT5 Service

**Base URL**: `http://45.32.89.134:3001`

**Endpoints**:
- `POST /test-connection` - Test MT5 broker connection
- `POST /fetch-trades` - Fetch trades from MT5
- `GET /health` - Health check
- `GET /terminals/stats` - Terminal statistics

**API Key**: `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

**Header**: `X-API-Key: bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

---

### Supabase Edge Functions

**Functions**:
- `test-broker-connection` - Tests connection via VPS
- `sync-broker-trades` - Syncs trades via VPS

**Required Secrets**:
- `VPS_MT5_SERVICE_URL` = `http://45.32.89.134:3001`
- `VPS_API_KEY` = `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

---

## ✅ Verification Checklist

### 1. VPS Service Configuration

**File**: `vps-broker-service/src/index.ts`

**Endpoints**:
```typescript
POST /test-connection
POST /fetch-trades
GET /health
GET /terminals/stats
```

**API Key Validation**:
```typescript
const API_KEY = process.env.VPS_API_KEY || '';
// Validates: req.headers['x-api-key'] === API_KEY
```

**Status**: ✅ **VERIFIED**

---

### 2. Edge Function Configuration

**File**: `supabase/functions/test-broker-connection/index.ts`

**VPS Call**:
```typescript
const VPS_MT5_SERVICE_URL = Deno.env.get('VPS_MT5_SERVICE_URL')
const VPS_API_KEY = Deno.env.get('VPS_API_KEY')

await fetch(`${VPS_MT5_SERVICE_URL}/test-connection`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': VPS_API_KEY
  },
  body: JSON.stringify({...})
})
```

**Status**: ✅ **VERIFIED**

---

**File**: `supabase/functions/sync-broker-trades/index.ts`

**VPS Call**:
```typescript
const VPS_MT5_SERVICE_URL = Deno.env.get('VPS_MT5_SERVICE_URL') || 'http://45.32.89.134:3001'
const VPS_API_KEY = Deno.env.get('VPS_API_KEY')

await fetch(`${VPS_MT5_SERVICE_URL}/fetch-trades`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': VPS_API_KEY
  },
  body: JSON.stringify({...})
})
```

**Status**: ✅ **VERIFIED**

---

## 🚀 Deployment Steps

### Step 1: Set Supabase Secrets

**Option A: Using Supabase CLI**
```bash
supabase secrets set VPS_MT5_SERVICE_URL=http://45.32.89.134:3001
supabase secrets set VPS_API_KEY=bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d
```

**Option B: Using Supabase Dashboard**
1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/settings/secrets
2. Add secret: `VPS_MT5_SERVICE_URL` = `http://45.32.89.134:3001`
3. Add secret: `VPS_API_KEY` = `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

### Step 2: Deploy Edge Functions

```bash
npx supabase functions deploy test-broker-connection
npx supabase functions deploy sync-broker-trades
```

### Step 3: Deploy VPS Service

**On Windows VPS**:
```powershell
cd C:\vps-broker-service
.\vps-setup\SAFE_DEPLOY_BROKER_SERVICE.ps1
```

### Step 4: Verify Endpoints

**Run verification script**:
```powershell
.\vps-setup\VERIFY_AND_DEPLOY_ENDPOINTS.ps1
```

---

## 🔗 Connection Flow

```
Frontend (Browser)
    ↓
    POST /functions/v1/test-broker-connection
    Headers: Authorization: Bearer <token>
    Body: { broker_type, encrypted_login, encrypted_password, encrypted_server }
    ↓
Supabase Edge Function (test-broker-connection)
    ↓
    POST http://45.32.89.134:3001/test-connection
    Headers: X-API-Key: bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d
    Body: { broker_type, encrypted_login, encrypted_password, encrypted_server, user_id }
    ↓
VPS MT5 Service (Port 3001)
    ↓
    Decrypts credentials
    Spawns Python script
    ↓
Python Script (test_connection.py)
    ↓
    mt5.initialize() + mt5.login()
    ↓
MT5 Terminal
    ↓
    Returns account_info
    ↓
VPS Service → Edge Function → Frontend
```

---

## ✅ Endpoint Matching Verification

| Component | Endpoint | URL/Path | API Key | Status |
|-----------|----------|----------|---------|--------|
| **Edge Function** | Calls VPS | `http://45.32.89.134:3001/test-connection` | `VPS_API_KEY` | ✅ |
| **VPS Service** | Receives | `POST /test-connection` | Validates `X-API-Key` | ✅ |
| **Edge Function** | Calls VPS | `http://45.32.89.134:3001/fetch-trades` | `VPS_API_KEY` | ✅ |
| **VPS Service** | Receives | `POST /fetch-trades` | Validates `X-API-Key` | ✅ |

**All endpoints match!** ✅

---

## 🧪 Testing

### Test VPS Service Directly

```powershell
$apiKey = "bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d"
$body = @{
    broker_type = "ecmarkets"
    encrypted_login = "test"
    encrypted_password = "test"
    encrypted_server = "test"
    user_id = "test"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/test-connection" `
    -Method POST `
    -Headers @{
        "X-API-Key" = $apiKey
        "Content-Type" = "application/json"
    } `
    -Body $body
```

### Test Edge Function

```bash
curl -X POST https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/test-broker-connection \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "broker_type": "ecmarkets",
    "encrypted_login": "test",
    "encrypted_password": "test",
    "encrypted_server": "test"
  }'
```

### Test Frontend

1. Start frontend: `npm run dev`
2. Navigate to: `http://localhost:5173/dashboard/journal-xx-pro`
3. Connect broker with credentials
4. Monitor browser console and network tab

---

## 🐛 Troubleshooting

### Issue: "VPS service not configured"

**Cause**: Supabase secrets not set

**Solution**:
```bash
supabase secrets set VPS_MT5_SERVICE_URL=http://45.32.89.134:3001
supabase secrets set VPS_API_KEY=bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d
```

### Issue: "Invalid API key"

**Cause**: API key mismatch between Edge Function and VPS

**Solution**: Verify both use the same key:
- Edge Function secret: `VPS_API_KEY`
- VPS service `.env`: `VPS_API_KEY`

### Issue: "Connection refused"

**Cause**: VPS service not running or firewall blocking

**Solution**:
1. Check VPS service: `pm2 list`
2. Check firewall: Allow port 3001
3. Test locally: `Invoke-WebRequest http://localhost:3001/health`

---

## 📝 Summary

✅ **All endpoints match and are configured correctly**

- VPS Service: `http://45.32.89.134:3001`
- Edge Functions: Call VPS at correct URL
- API Keys: Match between Edge Function and VPS
- Endpoints: `/test-connection` and `/fetch-trades` match

**Ready for deployment!**
