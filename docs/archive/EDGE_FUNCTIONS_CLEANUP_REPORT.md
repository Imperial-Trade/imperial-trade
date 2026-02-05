# 🔍 EDGE FUNCTIONS COMPREHENSIVE AUDIT

**Date**: January 16, 2025  
**Total Edge Functions**: 103  
**Action Required**: Delete 15 obsolete functions

---

## ❌ FUNCTIONS TO DELETE (Causing Issues)

### 🚨 **HIGH PRIORITY - OLD NOTIFICATION SYSTEM (DELETE THESE!)**

These are **OBSOLETE** and **causing conflicts** with the new notification system:

1. ✅ **`enhanced-signal-notification-dispatcher`** (v574)
   - **Status**: Already deleted from codebase
   - **Issue**: Old monolithic notification system
   - **Action**: ✅ Already removed

2. ✅ **`signal-notification-dispatcher`** (v1173)
   - **Status**: Already deleted from codebase  
   - **Issue**: Old notification system
   - **Action**: ✅ Already removed

3. ✅ **`priority-alert-monitor`** (v992)
   - **Status**: Already deleted from codebase
   - **Issue**: Calls old notification dispatcher
   - **Action**: ✅ Already removed

4. ✅ **`order-trigger-monitor`** (v897)
   - **Status**: Already deleted from codebase
   - **Issue**: Calls old notification dispatcher
   - **Action**: ✅ Already removed

5. ✅ **`price-monitoring`** (v225)
   - **Status**: Already deleted from codebase
   - **Issue**: Calls old notification dispatcher
   - **Action**: ✅ Already removed

6. ❌ **`test-notification`** (v218)
   - **Issue**: Old test function for obsolete system
   - **Action**: **DELETE NOW**

---

### 🔍 **DETECTOR FUNCTIONS (NOW OBSOLETE)**

These detector functions were created but are **NO LONGER USED** because detection is now integrated into `price-ingestor`:

7. ❌ **`tp1-detector`** (v15) - 401 errors, not used
8. ❌ **`tp2-detector`** (v14) - Not used
9. ❌ **`tp3-detector`** (v14) - Not used
10. ❌ **`tp4-detector`** (v14) - Not used
11. ❌ **`tp5-detector`** (v14) - Not used
12. ❌ **`stop-loss-detector`** (v14) - Not used
13. ❌ **`limit-activation-detector`** (v14) - Not used

**Why Delete**: `price-ingestor` now has **integrated instant detection** (500ms-1s). These separate detectors are obsolete and unused.

---

### 🧪 **TEST/DEBUG FUNCTIONS (OBSOLETE)**

14. ❌ **`test-signal-notification`** (v415)
15. ❌ **`test-notifications`** (v459)
16. ❌ **`test-pipeline`** (v57)
17. ❌ **`test-pipeline-complete`** (v50)

**Why Delete**: Old test functions for systems that no longer exist.

---

## ✅ FUNCTIONS TO **KEEP** (Essential for Notifications)

### 🔔 **NEW NOTIFICATION SYSTEM (ACTIVE & WORKING)**

These are the **CURRENT** notification functions called by the database trigger:

1. ✅ **`notify-signal-created`** (v18) - Signal creation notifications
2. ✅ **`notify-tp1-hit`** (v14) - TP1 specific notifications
3. ✅ **`notify-tp2-hit`** (v14) - TP2 specific notifications
4. ✅ **`notify-tp3-hit`** (v14) - TP3 specific notifications
5. ✅ **`notify-tp4-hit`** (v14) - TP4 specific notifications
6. ✅ **`notify-tp5-hit`** (v14) - TP5 specific notifications
7. ✅ **`notify-tp-hit`** (v18) - Generic TP fallback
8. ✅ **`notify-stop-loss-hit`** (v18) - Stop loss notifications
9. ✅ **`notify-limit-activated`** (v18) - Limit activation notifications
10. ✅ **`notify-signal-closed`** (v18) - Signal closure notifications
11. ✅ **`notify-notes-updated`** (v18) - Notes update notifications

---

### 💰 **PRICE SYSTEM (ESSENTIAL)**

12. ✅ **`price-ingestor`** (v297)
    - **Purpose**: Receives prices from `imperial-trade-ingress-worker`
    - **Features**: Integrated instant TP/SL detection (500ms-1s)
    - **Status**: **CRITICAL - DO NOT DELETE**

13. ✅ **`live-price-stream`** (v718)
14. ✅ **`live-price-broadcaster`** (v483)
15. ✅ **`gold-price-feed`** (v482)
16. ✅ **`unified-price-stream`** (v478)

---

### 🔐 **USER MANAGEMENT & AUTH**

17. ✅ **`admin-user-management`** (v1205)
18. ✅ **`simplified-signup`** (v80)
19. ✅ **`unified-account-approval`** (v67)
20. ✅ **`check-user-existence`** (v1063)
21. ✅ **`register-device-token`** (v44)
22. ✅ **`account-approval`** (v935)
23. ✅ **`create-approved-account`** (v15)
24. ✅ **`migrate-approved-accounts`** (v77)

---

### 📱 **ONESIGNAL PUSH NOTIFICATIONS**

25-35. ✅ All OneSignal functions (for mobile push notifications)

---

### 🎓 **ACADEMY & COACHING**

36-45. ✅ All academy, coach, and AI agent functions

---

### 📹 **ZOOM & VIMEO INTEGRATIONS**

46-60. ✅ All Zoom and Vimeo functions

---

### 🧹 **MAINTENANCE**

61. ✅ **`cleanup-old-data`** (v349)
62. ✅ **`notification-cleanup`** (v333)
63. ✅ **`ultra-cost-cleanup`** (v131)
64. ✅ **`reset`** (v132)

---

## 🚨 ROOT CAUSE OF NOTIFICATION FAILURE

### **THE PROBLEM:**

1. **Detector Functions Getting 401 Errors**
   - `tp1-detector`, `tp2-detector`, etc. are receiving 401 Unauthorized
   - These are being called by **something old** (likely cron jobs)

2. **Database Trigger Not Firing**
   - The `instant_notification_trigger` is **not logging** when TP hits occur
   - This means the trigger is **returning early** before calling Edge Functions

3. **Old System Still Active**
   - Old Edge Functions like `test-notification` and detector functions are still deployed
   - They're consuming resources and causing confusion

---

## ✅ IMMEDIATE FIX PLAN

### **Step 1: Delete Obsolete Edge Functions**

Delete these 17 functions:

```bash
# Old notification system
supabase functions delete test-notification

# Detector functions (now obsolete)
supabase functions delete tp1-detector
supabase functions delete tp2-detector
supabase functions delete tp3-detector
supabase functions delete tp4-detector
supabase functions delete tp5-detector
supabase functions delete stop-loss-detector
supabase functions delete limit-activation-detector

# Test functions
supabase functions delete test-signal-notification
supabase functions delete test-notifications
supabase functions delete test-pipeline
supabase functions delete test-pipeline-complete
```

### **Step 2: Remove Cron Jobs Calling Old Detectors**

The 401 errors on `tp1-detector` mean something is still trying to call it. Let's check cron jobs:

```sql
SELECT * FROM cron.job WHERE command LIKE '%detector%';
```

### **Step 3: Verify Database Trigger**

The trigger is **not logging** when TP1 hits. This is the CRITICAL issue.

Possible causes:
1. **Trigger returns early** due to logic issue
2. **Trigger is disabled**
3. **Another trigger is blocking it**

---

## 📊 SUMMARY

| Category | Total | Keep | Delete |
|----------|-------|------|--------|
| **Notification Functions** | 23 | 11 | 12 |
| **Price System** | 5 | 5 | 0 |
| **User Management** | 8 | 8 | 0 |
| **OneSignal Push** | 11 | 11 | 0 |
| **Academy/Coach** | 10 | 10 | 0 |
| **Zoom/Vimeo** | 30 | 30 | 0 |
| **Maintenance** | 4 | 4 | 0 |
| **Other** | 12 | 12 | 0 |
| **TOTAL** | **103** | **91** | **12** |

---

## 🎯 NEXT ACTIONS

1. **Delete 12 obsolete Edge Functions** (listed above)
2. **Remove any cron jobs** calling old detector functions
3. **Debug why trigger isn't logging** when TP1 hits
4. **Test notification flow** end-to-end

---

## 🔍 WHY NOTIFICATIONS AREN'T WORKING

The **real issue** is:

✅ New notification Edge Functions exist  
✅ Database trigger exists  
❌ **But trigger is NOT firing/logging when TP hits**

This means:
- Signal `6aa7dc4b` hit TP1 at `21:30:33`
- `instant_notification_trigger` should have logged `🔥 [TRIGGER START]`
- **NO LOGS appeared** = Trigger returned early

**We need to wait for the next TP/SL hit to see the new diagnostic logs** that will tell us exactly why the trigger is returning early.

