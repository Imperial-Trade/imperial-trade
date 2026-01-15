# Secrets Verification Required

## Expected Values:

1. **INGEST_SECRET**: `Imperial_Secret_2026`
   - Used by: MQL5 EA (`docs/ImperialSync.mq5`)
   - Used by: `supabase/functions/mt5-sync/index.ts`
   - Header: `x-ingest-key: Imperial_Secret_2026`

2. **VPS_API_KEY**: Should match the VPS service API key
   - Used by: Edge Functions calling VPS
   - Must match: VPS `.env` file value

## Next Steps:

Need to verify and set these secrets using Supabase MCP...
