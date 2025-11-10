# 🗑️ DELETE OBSOLETE EDGE FUNCTIONS

**Date**: January 16, 2025  
**Action Required**: Delete 12 obsolete Edge Functions  
**Method**: Run commands in your local terminal (has proper Supabase access)

---

## ⚠️ IMPORTANT NOTES

- These functions are **obsolete** and **not used** by the current system
- Deleting them will **improve performance** and **reduce confusion**
- The new notification system uses **different** Edge Functions (which we're keeping)
- **Run these commands one at a time** to ensure each deletion succeeds

---

## 🚀 DELETION COMMANDS

### Step 1: Set Your Supabase Access Token

```bash
export SUPABASE_ACCESS_TOKEN="sbp_5f2e813dcad3e5546b7d9b0e94efb4cca0a0304b"
cd "/Users/nthny_11/Trade imperial GITHUB /sidebar/imperial-trade"
```

---

### Step 2: Delete Old Notification System Function (1)

```bash
# Delete old test notification function
supabase functions delete test-notification --project-ref kmuoqkcxguafxulqlbmi
```

**Expected Output**: `Deleted Function test-notification successfully.`

---

### Step 3: Delete Obsolete Detector Functions (7)

These detectors are **no longer used** because `price-ingestor` now has integrated detection:

```bash
# Delete TP detectors
supabase functions delete tp1-detector --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete tp2-detector --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete tp3-detector --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete tp4-detector --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete tp5-detector --project-ref kmuoqkcxguafxulqlbmi

# Delete SL and Limit detectors
supabase functions delete stop-loss-detector --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete limit-activation-detector --project-ref kmuoqkcxguafxulqlbmi
```

**Expected Output (for each)**: `Deleted Function [name] successfully.`

---

### Step 4: Delete Test Functions (4)

```bash
# Delete old test functions
supabase functions delete test-signal-notification --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete test-notifications --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete test-pipeline --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete test-pipeline-complete --project-ref kmuoqkcxguafxulqlbmi
```

**Expected Output (for each)**: `Deleted Function [name] successfully.`

---

## ✅ VERIFICATION

After deleting all 12 functions, verify they're gone:

```bash
supabase functions list --project-ref kmuoqkcxguafxulqlbmi | grep -E "test-notification|detector|test-pipeline"
```

**Expected Output**: No results (functions deleted)

---

## 📊 DELETION SUMMARY

| Category | Functions to Delete | Count |
|----------|-------------------|-------|
| Old Notification System | `test-notification` | 1 |
| Detector Functions | `tp1-5-detector`, `stop-loss-detector`, `limit-activation-detector` | 7 |
| Test Functions | `test-signal-notification`, `test-notifications`, `test-pipeline`, `test-pipeline-complete` | 4 |
| **TOTAL** | | **12** |

---

## 🔒 WHAT YOU'RE **KEEPING** (DO NOT DELETE!)

### ✅ New Notification System (11 functions):
- `notify-signal-created`
- `notify-tp1-hit`
- `notify-tp2-hit`
- `notify-tp3-hit`
- `notify-tp4-hit`
- `notify-tp5-hit`
- `notify-tp-hit` (fallback)
- `notify-stop-loss-hit`
- `notify-limit-activated`
- `notify-signal-closed`
- `notify-notes-updated`

### ✅ Price System:
- `price-ingestor` ⚠️ **CRITICAL - DO NOT DELETE**
- `live-price-stream`
- `live-price-broadcaster`
- `gold-price-feed`
- `unified-price-stream`

### ✅ Everything Else:
- All user management, OneSignal, Academy, Zoom, Vimeo functions

---

## 🎯 AFTER DELETION

Once you've deleted these 12 functions:

1. ✅ **No more 401 errors** on detector functions
2. ✅ **Cleaner Edge Functions list**
3. ✅ **Better performance** (fewer unused functions)
4. ✅ **Less confusion** about which functions are active

---

## 🔍 NEXT STEP: DEBUG THE TRIGGER

After deleting these functions, we still need to:

**Wait for the next TP/SL hit** to see the new diagnostic logs in Postgres logs.

The trigger is currently **not logging** when TP hits occur, which means it's returning early before calling the notification Edge Functions.

The new diagnostic logging will show us exactly why!

---

## 📝 QUICK REFERENCE

**All 12 functions to delete** (copy-paste friendly):

```bash
export SUPABASE_ACCESS_TOKEN="sbp_5f2e813dcad3e5546b7d9b0e94efb4cca0a0304b"
cd "/Users/nthny_11/Trade imperial GITHUB /sidebar/imperial-trade"

supabase functions delete test-notification --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete tp1-detector --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete tp2-detector --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete tp3-detector --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete tp4-detector --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete tp5-detector --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete stop-loss-detector --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete limit-activation-detector --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete test-signal-notification --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete test-notifications --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete test-pipeline --project-ref kmuoqkcxguafxulqlbmi
supabase functions delete test-pipeline-complete --project-ref kmuoqkcxguafxulqlbmi
```

---

**Status**: Ready for deletion - run commands in your local terminal with proper Supabase access.

