# X-INGEST-KEY Verification

## What is X-INGEST-KEY?

`x-ingest-key` is an HTTP header used for authentication when external services (MQL5 EA, VPS services) send data to Supabase Edge Functions.

---

## How It Works

1. **Secret Storage**: The secret value is stored as `INGEST_SECRET` in Supabase Edge Function secrets
2. **Header Name**: `x-ingest-key` or `X-INGEST-KEY` (case-insensitive)
3. **Authentication**: Edge Functions check if the header value matches `INGEST_SECRET`
4. **Security**: Prevents unauthorized access to Edge Functions that receive external data

---

## What Uses X-INGEST-KEY?

### 1. **mt5-sync Edge Function** ✅
- **Purpose**: Receives trade data from MQL5 EA
- **Location**: `supabase/functions/mt5-sync/index.ts`
- **Code**: Line 32-34
```typescript
const ingestKey = req.headers.get('x-ingest-key')
if (ingestKey !== INGEST_SECRET) {
  return new Response('Unauthorized', { status: 401 })
}
```
- **Default Value**: `Imperial_Secret_2026` (fallback if secret not set)
- **Used By**: MQL5 EA (ImperialSync.mq5) sends trades

### 2. **price-ingestor Edge Function** ✅
- **Purpose**: Receives price data from VPS price feeder
- **Location**: `supabase/functions/price-ingestor/index.ts`
- **Code**: Line 271-288
```typescript
const ingestKey = req.headers.get('X-INGEST-KEY') || req.headers.get('x-ingest-key')
if (!ingestKey || ingestKey !== expectedKey) {
  return new Response('Unauthorized', { status: 401 })
}
```
- **Used By**: VPS price feeder service

### 3. **journal-ingestor Edge Function** (if exists)
- **Purpose**: Receives journal entries
- **Used By**: VPS auto-sync service

---

## Current Configuration

### Default Value in Code
- **mt5-sync**: `Imperial_Secret_2026` (line 23)
- **MQL5 EA**: `Imperial_Secret_2026` (docs/ImperialSync.mq5 line 74)

### Supabase Secret
- **Name**: `INGEST_SECRET`
- **Value**: Should be set in Supabase Dashboard
- **Status**: Checking...

---

## Verification Checklist

- [ ] `INGEST_SECRET` is set in Supabase Edge Function secrets
- [ ] MQL5 EA uses the same value in `x-ingest-key` header
- [ ] VPS services use the same value
- [ ] All Edge Functions check this header correctly

---

## Configuration Locations

1. **Supabase Secrets**: 
   - Dashboard → Edge Functions → Settings → Secrets
   - Name: `INGEST_SECRET`
   - Value: (should match code/default)

2. **MQL5 EA Code**:
   - File: `docs/ImperialSync.mq5`
   - Line 74: `x-ingest-key: Imperial_Secret_2026`

3. **VPS Services**:
   - `.env` file: `INGEST_SECRET=...`
   - Should match Supabase secret value

---

## Security Notes

- ✅ Header name is case-insensitive (`x-ingest-key` or `X-INGEST-KEY`)
- ✅ Edge Functions reject requests without valid key (401 Unauthorized)
- ⚠️ Default value in code is a fallback - should use Supabase secret instead
- ⚠️ Secret should be different from default in production
