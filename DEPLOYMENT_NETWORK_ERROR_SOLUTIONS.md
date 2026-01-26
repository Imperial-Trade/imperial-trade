# Deployment Network Error - Solutions

## Error:
```
Import 'https://esm.sh/@supabase/supabase-js@2' failed: 522 <unknown status code>
```

## Problem:
The `esm.sh` CDN (where the Supabase JS library is hosted) is timing out during Docker bundling. This is a **network/CDN issue**, not your code.

## Solutions:

### Option 1: Retry Without Docker (Recommended First)

The bundling service might be working now. Try deploying without Docker:

```bash
supabase functions deploy test-broker-connection
```

### Option 2: Wait and Retry with Docker

The `esm.sh` CDN might be temporarily down. Wait 5-10 minutes, then retry:

```bash
supabase functions deploy test-broker-connection --use-docker
```

### Option 3: Use Specific Version Instead of Latest

Change the import to use a specific version that might be cached:

**Edit:** `supabase/functions/test-broker-connection/index.ts` line 12:

**From:**
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
```

**To:**
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
```

(Or any stable version number)

### Option 4: Try Direct Deno.land Import

**Change to:**
```typescript
import { createClient } from 'https://deno.land/x/supabase@2.39.3/mod.ts'
```

### Option 5: Check Network/Firewall

Make sure your network can reach:
- `esm.sh`
- `deno.land`

Try:
```bash
curl -I https://esm.sh/@supabase/supabase-js@2
```

## Recommended Action:

1. **First**: Try Option 1 (deploy without Docker) - the Supabase service might be working now
2. **If that fails**: Try Option 2 (wait and retry with Docker)
3. **If still failing**: Try Option 3 (specific version)







