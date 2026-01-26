# Set Journal Ingestor Secret

## ✅ Edge Function Deployed

The `journal-ingestor` edge function has been deployed successfully!

## 🔐 Set Environment Secret

You need to set the `INGEST_SECRET` environment variable for the function:

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions/journal-ingestor
2. Click **Settings** tab
3. Scroll to **Secrets** section
4. Click **Add Secret**
5. Enter:
   - **Name:** `INGEST_SECRET`
   - **Value:** (Use the same value as your `price-ingestor` function, or generate a new secure key)

### Option 2: Use Same Secret as Price Ingestor

If you want to use the same secret as `price-ingestor`:
1. Check your `price-ingestor` function secrets
2. Copy the `INGEST_SECRET` value
3. Add it to `journal-ingestor` function

### Generate New Secret (if needed)

If you need a new secret, you can generate one:

```bash
# On Mac/Linux
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📝 Update VPS .env

Make sure your VPS `.env` file has the same `INGEST_SECRET` value:

```bash
INGEST_SECRET=your-secret-value-here
```

**Important:** The `INGEST_SECRET` in your VPS `.env` must match the secret in the Supabase edge function!

## ✅ Verification

After setting the secret, test the function:

```bash
curl -X POST https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/journal-ingestor \
  -H "Content-Type: application/json" \
  -H "X-INGEST-KEY: your-secret-value" \
  -d '{"connection_id":"test","trades":[]}'
```

You should get a response (even if it's an error about missing trades, that means auth worked).

---

**Next Step:** Update your VPS `.env` file and restart the broker service!


