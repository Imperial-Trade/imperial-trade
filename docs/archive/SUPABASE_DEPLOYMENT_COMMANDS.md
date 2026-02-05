# 🚀 SUPABASE EDGE FUNCTIONS - DEPLOYMENT COMMANDS

**Issue:** MCP tool cannot handle `_shared` module imports  
**Solution:** Deploy via Supabase CLI (you have access)

---

## ✅ **DEPLOY ALL FUNCTIONS NOW**

Run these commands in your terminal:

```bash
# Navigate to project
cd "C:\Users\Jacob Estayo\Trade imperial\imperial-trade"

# Option 1: Deploy all functions at once (RECOMMENDED)
supabase functions deploy --project-ref kmuoqkcxguafxulqlbmi

# Option 2: Deploy critical notification functions one by one
supabase functions deploy notify-signal-created --project-ref kmuoqkcxguafxulqlbmi
supabase functions deploy notify-tp-hit --project-ref kmuoqkcxguafxulqlbmi
supabase functions deploy notify-stop-loss-hit --project-ref kmuoqkcxguafxulqlbmi
supabase functions deploy notify-signal-closed --project-ref kmuoqkcxguafxulqlbmi
supabase functions deploy notify-limit-activated --project-ref kmuoqkcxguafxulqlbmi
supabase functions deploy notify-notes-updated --project-ref kmuoqkcxguafxulqlbmi
```

---

## 🔑 **IF YOU GET "Access token not provided" ERROR:**

### Get your Supabase Access Token:

1. Go to: https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Name it: "CLI Access"
4. Copy the token

### Set the token:

```powershell
# Windows PowerShell
$env:SUPABASE_ACCESS_TOKEN="your-token-here"

# Then run deploy commands
supabase functions deploy --project-ref kmuoqkcxguafxulqlbmi
```

---

## 📊 **VERIFY DEPLOYMENT**

After deploying, check the dashboard:
https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions

You should see these functions:
- ✅ notify-signal-created
- ✅ notify-tp-hit  
- ✅ notify-stop-loss-hit
- ✅ notify-signal-closed
- ✅ notify-limit-activated
- ✅ notify-notes-updated

---

## 🧪 **TEST AFTER DEPLOYMENT**

```bash
curl -X POST \
  'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-signal-created' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "signal": {
      "id": "test-123",
      "asset_name": "EURUSD",
      "trade_type": "buy",
      "entry_price": 1.0850,
      "author_name": "Test Provider",
      "user_id": "test-user-id"
    },
    "users": [],
    "push_users": []
  }'
```

**Expected:** `{"success": true}`

---

## ⚠️ **WHY I CAN'T DEPLOY VIA MCP**

The MCP Supabase tool has a limitation with shared modules:
- Your functions import from `../_shared/notification-core.ts`
- MCP can only deploy single-file functions
- To deploy via MCP, I'd need to inline 467 lines of code into each of 6 functions (2,802 lines total)
- That's impractical and error-prone

**Better solution:** You deploy via CLI (5 minutes)

---

## 🎯 **DEPLOY NOW**

```bash
cd "C:\Users\Jacob Estayo\Trade imperial\imperial-trade"
supabase functions deploy --project-ref kmuoqkcxguafxulqlbmi
```

That's it! Then test with the curl command above.

