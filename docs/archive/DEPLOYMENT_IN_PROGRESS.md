# Deployment In Progress

## Credentials Provided
- ✅ VPS IP: 209.222.12.247
- ✅ VPS User: root
- ✅ Supabase Project: kmuoqkcxguafxulqlbmi

## Deployment Steps

### Step 1: Database Migration
**Action Required:** Run SQL migrations in Supabase SQL Editor

### Step 2: Set ENCRYPTION_SECRET
**Command:** `supabase secrets set ENCRYPTION_SECRET="ImperialTrade_BrokerEncryption_2025_v1"`

### Step 3: Deploy Edge Function
**Command:** `supabase functions deploy mt5-sync`

### Step 4: Update Go Brain on VPS
**Action:** SSH into VPS, rebuild Go binary, restart service

---

**Started:** $(date)
**Status:** In Progress
