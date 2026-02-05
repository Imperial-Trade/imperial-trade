# Fixed: Replaced esm.sh with npm: Import

## Problem:
- `esm.sh` CDN is having issues (as per Supabase status page)
- This was causing bundle generation timeouts

## Solution:
Replaced the import from `esm.sh` to `npm:` as recommended by Supabase.

## Change Made:

**File:** `supabase/functions/test-broker-connection/index.ts`

**Line 12 - Changed from:**
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
```

**To:**
```typescript
import { createClient } from 'npm:@supabase/supabase-js@2'
```

## Compatibility Check:

✅ **Compatible with Deno/Supabase Edge Functions:**
- Deno natively supports `npm:` imports
- Supabase Edge Functions run on Deno runtime
- `npm:@supabase/supabase-js@2` will work exactly the same as `esm.sh` version
- No code changes needed - just the import URL

✅ **Functionality:**
- Same API (`createClient` works identically)
- Same features and behavior
- Only the package source changed (npm registry instead of esm.sh CDN)

## Deploy Now:

```bash
supabase functions deploy test-broker-connection --use-docker
```

Or without Docker:
```bash
supabase functions deploy test-broker-connection
```

This should now work without timeout issues!







