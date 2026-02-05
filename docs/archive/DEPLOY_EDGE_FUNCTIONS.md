# 🚀 EDGE FUNCTION DEPLOYMENT INSTRUCTIONS

**Date:** 2025-11-12  
**Critical Fix:** UUID parsing error in `notification-core.ts`

---

## 📦 **WHAT WAS FIXED:**

The `notification-core.ts` file now correctly extracts `user_id` from user objects:

```typescript
// OLD CODE (v47) - FAILED:
.in('id', pushUserIds)  // Expected ['uuid1', 'uuid2'], got [{user_id: 'uuid1'}, ...]

// NEW CODE (v48) - FIXED:
const userIds = Array.isArray(pushUserIds) 
  ? pushUserIds.map((u: any) => typeof u === 'string' ? u : u.user_id).filter(Boolean)
  : [];
.in('id', userIds)  // Now correctly handles both strings and objects
```

---

## 🎯 **FUNCTIONS TO DEPLOY:**

All 6 notification Edge Functions need deployment (they all share `_shared/notification-core.ts`):

1. ✅ `notify-signal-created` (ID: `59c98d7b-01ed-4cb6-8d6b-45ad8d9fb6cc`)
2. ✅ `notify-tp-hit` (ID: `9d9b9425-5d7b-494b-b9d6-8ffe03f79011`)
3. ✅ `notify-stop-loss-hit` (ID: `2a2f2223-1767-4014-b4a6-99acf7815ef2`)
4. ✅ `notify-signal-closed` (ID: `08483cbd-3877-4915-a1c1-a907075b830d`)
5. ✅ `notify-limit-activated` (ID: `c820e254-ff70-4e90-8601-6cba375bfea1`)
6. ✅ `notify-notes-updated` (ID: `65412e4c-c9cd-4d9a-85eb-0032f411fd90`)

---

## 🔧 **DEPLOYMENT METHOD:**

### **Option 1: Via Supabase Dashboard (Manual)**

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions
2. For each function above:
   - Click "Deploy new version"
   - Select `supabase/functions/[function-name]`
   - Click "Deploy"

### **Option 2: Via Supabase CLI (Automated)**

```bash
cd "/Users/nthny_11/Trade imperial GITHUB /sidebar/imperial-trade"

# Deploy all notification functions
supabase functions deploy notify-signal-created --project-ref kmuoqkcxguafxulqlbmi --no-verify-jwt
supabase functions deploy notify-tp-hit --project-ref kmuoqkcxguafxulqlbmi --no-verify-jwt
supabase functions deploy notify-stop-loss-hit --project-ref kmuoqkcxguafxulqlbmi --no-verify-jwt
supabase functions deploy notify-signal-closed --project-ref kmuoqkcxguafxulqlbmi --no-verify-jwt
supabase functions deploy notify-limit-activated --project-ref kmuoqkcxguafxulqlbmi --no-verify-jwt
supabase functions deploy notify-notes-updated --project-ref kmuoqkcxguafxulqlbmi --no-verify-jwt
```

### **Option 3: Deploy All at Once**

```bash
supabase functions deploy --project-ref kmuoqkcxguafxulqlbmi --no-verify-jwt
```

---

## ✅ **EXPECTED RESULT:**

After deployment, each function will be at **version 48** (up from version 47).

You can verify by checking:
```bash
supabase functions list --project-ref kmuoqkcxguafxulqlbmi
```

---

## 🧪 **TEST AFTER DEPLOYMENT:**

1. Create a new test signal (BITCOIN or XAUUSD)
2. Check Edge Function logs for "✅ [Realtime Broadcast] SUCCESS"
3. Verify NO UUID parsing errors appear
4. Confirm in-app notifications display correctly

---

## 📊 **FILES MODIFIED:**

- ✅ `supabase/functions/_shared/notification-core.ts` (lines 167-176, 334-342)
- ✅ Committed to `main` branch (commit `c9ff3341`)

---

**Status:** Ready for deployment - code is correct and committed to GitHub.
