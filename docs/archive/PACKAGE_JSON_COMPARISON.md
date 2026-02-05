# ❌ Package.json Comparison

## ❌ The file you showed (WRONG - from MetaApi example)

**Location:** `/Users/nthny_11/Downloads/code-sample-node-streaming-4158f3d7-08b5-4e23-9202-18ef753aabe1 (1)/package.json`

```json
{
  "name": "examples",
  "description": "MetaApi example scripts",
  "version": "1.0.0",
  "dependencies": {
    "metaapi.cloud-sdk": "^29.0.0",  // ❌ NEWER version (v29)
    "dotenv": "^16.0.3"               // ❌ NOT needed
  },
  "scripts": {
    "example:rpc": "node -r dotenv/config ./rpcExample.js",
    "example:synchronization": "node -r dotenv/config ./synchronizationExample.js"
  }
}
```

**Issues:**
- ❌ Wrong name: "examples" (should be "imperial-ingress-worker")
- ❌ Missing `@supabase/supabase-js` dependency (REQUIRED!)
- ❌ Has `dotenv` (not needed for DigitalOcean Worker)
- ❌ Wrong scripts (example scripts, not worker scripts)
- ❌ Wrong version (1.0.0 vs 2.0.0)
- ❌ Wrong SDK version (v29 vs v21)

---

## ✅ The CORRECT package.json (in GitHub repository)

**Location:** `Imperial-Trade/imperial-trade-ingress-worker/package.json`

```json
{
  "name": "imperial-ingress-worker",
  "version": "2.0.0",
  "description": "High-frequency MetaApi to Supabase price ingestor (2 updates/second)",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node index.js"
  },
  "dependencies": {
    "metaapi.cloud-sdk": "^21.0.0",      // ✅ Correct version
    "@supabase/supabase-js": "^2.39.0"   // ✅ REQUIRED for Supabase RPC calls
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Correct:**
- ✅ Correct name: "imperial-ingress-worker"
- ✅ Has `@supabase/supabase-js` (REQUIRED for RPC calls)
- ✅ No `dotenv` (not needed - DigitalOcean uses env vars directly)
- ✅ Correct scripts (start/dev point to index.js)
- ✅ Correct version (2.0.0)
- ✅ Correct SDK version (v21 - tested and stable)
- ✅ Has `engines` field for Node.js version

---

## 🎯 Key Differences

| Feature | Example (WRONG) | Worker (CORRECT) |
|---------|----------------|------------------|
| Name | "examples" | "imperial-ingress-worker" |
| Version | 1.0.0 | 2.0.0 |
| MetaApi SDK | ^29.0.0 | ^21.0.0 |
| Supabase SDK | ❌ Missing | ✅ ^2.39.0 |
| dotenv | ✅ Included | ❌ Not needed |
| Scripts | Example scripts | node index.js |

---

## ✅ Status

**The GitHub repository has the CORRECT package.json** ✅

The file you showed is from a MetaApi example/template in your Downloads folder - **do NOT use it for the worker!**

The worker is already deployed with the correct package.json. Check the runtime logs - you should see the worker starting correctly.
