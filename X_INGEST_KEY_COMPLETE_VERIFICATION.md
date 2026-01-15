# X-INGEST-KEY Complete Verification

## What is X-INGEST-KEY?

`x-ingest-key` is an HTTP header used for authentication when external services send data to Supabase Edge Functions.

**Purpose**: Prevents unauthorized access to Edge Functions that receive data from:
- MQL5 Expert Advisor (EA)
- VPS services (price feeder, auto-sync)
- External systems

---

## How It Works

1. **Secret Storage**: Value stored as `INGEST_SECRET` in Supabase Edge Function secrets
2. **Header Name**: `x-ingest-key` or `X-INGEST-KEY` (case-insensitive)
3. **Authentication Flow**:
   - Client sends request with `x-ingest-key: <secret-value>` header
   - Edge Function reads `INGEST_SECRET` from environment
   - Edge Function compares header value with `INGEST_SECRET`
   - If match: Request is authorized ✅
   - If no match: Returns 401 Unauthorized ❌

---

## What Uses X-INGEST-KEY?

### 1. **mt5-sync Edge Function** ⚠️ POTENTIAL ISSUE
- **File**: `supabase/functions/mt5-sync/index.ts`
- **Line**: 32-34
- **Used By**: MQL5 EA (ImperialSync.mq5)
- **Current Code Value**: `Imperial_Secret_2026` (fallback default)
- **MQL5 EA Code**: `Imperial_Secret_2026` (docs/ImperialSync.mq5 line 74)

### 2. **price-ingestor Edge Function**
- **File**: `supabase/functions/price-ingestor/index.ts`
- **Line**: 271-288
- **Used By**: VPS price feeder service
- **VPS .env**: `INGEST_SECRET=ImperialTrade_IngestSecret_2025_v1`

### 3. **journal-ingestor Edge Function** (if exists)
- **Used By**: VPS auto-sync service
- **VPS .env**: `INGEST_SECRET=ImperialTrade_IngestSecret_2025_v1`

---

## ⚠️ CRITICAL FINDING: Value Mismatch!

### Problem Identified

There are **TWO different secret values** being used:

1. **`Imperial_Secret_2026`**
   - Used by: `mt5-sync` Edge Function (default fallback)
   - Used by: MQL5 EA (hardcoded)
   - Status: ⚠️ Inconsistent with other services

2. **`ImperialTrade_IngestSecret_2025_v1`**
   - Used by: `price-ingestor` Edge Function
   - Used by: VPS price feeder service
   - Used by: VPS auto-sync service
   - Status: ✅ Unified value

### Impact

- **mt5-sync** and **MQL5 EA** use `Imperial_Secret_2026`
- **price-ingestor** and **VPS services** use `ImperialTrade_IngestSecret_2025_v1`
- **This means**: They are using different secrets! ❌

---

## Supabase Secret Status

**Command Result**:
```
INGEST_SECRET | 415987faef016229e2bba0facf8358083427a49028cc2e5decf72a0272e6fc12
```

- ✅ Secret exists in Supabase
- ⚠️ Actual value is hashed (cannot see plaintext)
- ❓ Need to verify which value is actually set

---

## What Needs to Use X-INGEST-KEY?

### ✅ Currently Using (Correct)

1. **mt5-sync Edge Function**
   - Receives: Trade data from MQL5 EA
   - Header: `x-ingest-key`
   - Status: ✅ Using (but value may be wrong)

2. **price-ingestor Edge Function**
   - Receives: Price data from VPS
   - Header: `X-INGEST-KEY` or `x-ingest-key`
   - Status: ✅ Using

3. **journal-ingestor Edge Function** (if exists)
   - Receives: Journal entries from VPS
   - Header: `X-INGEST-KEY`
   - Status: ✅ Using

### 📝 Senders (Must Include Header)

1. **MQL5 EA (ImperialSync.mq5)**
   - Sends to: `mt5-sync`
   - Header: `x-ingest-key: Imperial_Secret_2026`
   - Status: ⚠️ Hardcoded value

2. **VPS Price Feeder**
   - Sends to: `price-ingestor`
   - Header: `X-INGEST-KEY: ImperialTrade_IngestSecret_2025_v1`
   - Status: ✅ Using env variable

3. **VPS Auto-Sync Service**
   - Sends to: `journal-ingestor`
   - Header: `X-INGEST-KEY: ImperialTrade_IngestSecret_2025_v1`
   - Status: ✅ Using env variable

---

## Recommendations

### Option 1: Unify to `ImperialTrade_IngestSecret_2025_v1` (Recommended)

1. **Update Supabase Secret**:
   ```bash
   supabase secrets set INGEST_SECRET=ImperialTrade_IngestSecret_2025_v1 --project-ref kmuoqkcxguafxulqlbmi
   ```

2. **Update MQL5 EA**:
   - File: `docs/ImperialSync.mq5`
   - Line 74: Change to `x-ingest-key: ImperialTrade_IngestSecret_2025_v1`
   - Recompile EA

3. **Verify mt5-sync uses Supabase secret**:
   - File: `supabase/functions/mt5-sync/index.ts`
   - Line 23: Should use `Deno.env.get('INGEST_SECRET')` (no fallback)
   - Remove default fallback or ensure it matches

### Option 2: Keep Current Values (If Already Working)

If `Imperial_Secret_2026` is actually set in Supabase secrets and working:
- Keep MQL5 EA as-is
- Ensure Supabase secret is `Imperial_Secret_2026`
- Update VPS services to use `Imperial_Secret_2026`

---

## Verification Checklist

- [ ] Verify actual `INGEST_SECRET` value in Supabase Dashboard
- [ ] Ensure all Edge Functions use the same secret
- [ ] Ensure all senders (MQL5 EA, VPS services) use matching value
- [ ] Test authentication with actual secret value
- [ ] Remove hardcoded fallbacks in code (use env vars only)

---

## Action Required

**CRITICAL**: Verify which secret value is actually set in Supabase and ensure all services use the same value!

1. Check Supabase Dashboard → Edge Functions → Settings → Secrets
2. Verify actual `INGEST_SECRET` value
3. Update all services to use the same value
4. Remove hardcoded defaults from code
