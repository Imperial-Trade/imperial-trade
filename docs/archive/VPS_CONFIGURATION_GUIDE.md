# VPS Configuration Guide

## Answers to Your Questions

### 1. Are these the correct Edge Functions?

**YES** - `sync-broker-trades` is the correct Edge Function for what we've built.

**Architecture:**
- Frontend calls: `supabase.functions.invoke('sync-broker-trades')`
- Edge Function calls: VPS service at `/fetch-trades` endpoint
- VPS service (Go Brain/Node.js) handles MT5 connections and fetches trades

This matches the architecture we've implemented.

---

### 2. Where do we get VPS_MT5_SERVICE_URL and VPS_API_KEY?

#### **VPS_MT5_SERVICE_URL:**
- **Value**: `http://209.222.12.247:3001`
- **Where**: This is the URL of your VPS Node.js service (vps-broker-service)
- **Default**: Already set in code as fallback: `'http://45.32.89.134:3001'`
- **Should be set as**: Supabase Edge Function secret named `VPS_MT5_SERVICE_URL`

#### **VPS_API_KEY:**
- **Value**: A secure API key that must match between:
  - Supabase Edge Function secret (`VPS_API_KEY`)
  - VPS service environment variable (`VPS_API_KEY` in `.env` file)
- **Generated key** (from setup): `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`
- **Where to set**:
  1. **Supabase**: Set as Edge Function secret
  2. **VPS**: Set in `.env` file on the VPS

---

## How to Set These Secrets in Supabase

```bash
# Set VPS_MT5_SERVICE_URL (CORRECT IP: 209.222.12.247)
supabase secrets set VPS_MT5_SERVICE_URL="http://209.222.12.247:3001"

# Set VPS_API_KEY (use the generated key from setup, or generate a new one)
supabase secrets set VPS_API_KEY="bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d"
```

---

## Verification

The Edge Function checks for these:
- If missing, returns: `"VPS service not configured. Missing VPS_MT5_SERVICE_URL or VPS_API_KEY in Supabase Edge Function secrets."`

This is likely the cause of your current error!
