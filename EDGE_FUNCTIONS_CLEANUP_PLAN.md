# 🗑️ EDGE FUNCTIONS CLEANUP PLAN

## 📊 **CURRENT EDGE FUNCTIONS AUDIT**

### ✅ **KEEP - Active New Notification System** (10 functions)
These are the NEW instant notification system - **KEEP ALL**:
- `notify-signal-created` ✅ KEEP
- `notify-tp1-hit` ✅ KEEP
- `notify-tp2-hit` ✅ KEEP
- `notify-tp3-hit` ✅ KEEP
- `notify-tp4-hit` ✅ KEEP
- `notify-tp5-hit` ✅ KEEP
- `notify-stop-loss-hit` ✅ KEEP
- `notify-limit-activated` ✅ KEEP
- `notify-signal-closed` ✅ KEEP
- `notify-notes-updated` ✅ KEEP

### ✅ **KEEP - Core Signal/Price System** (3 functions)
Essential for signal stream and prices - **KEEP ALL**:
- `price-ingestor` ✅ KEEP (ingests live prices)
- `order-trigger-monitor` ✅ KEEP (monitors limit orders)
- `priority-alert-monitor` ✅ KEEP (monitors priority alerts)

### ❌ **REMOVE - Old/Redundant Notification System** (4 functions)
These are OLD and no longer called - **DELETE ALL**:
- `enhanced-signal-notification-dispatcher` ❌ DELETE (old system)
- `signal-notification-dispatcher` ❌ DELETE (old system)
- `price-monitoring` ❌ DELETE (replaced by new system)
- `test-notification` ❌ DELETE (testing only)

### ⚠️ **MAYBE KEEP - Legacy/Fallback** (1 function)
- `notify-tp-hit` ⚠️ **DECISION NEEDED**
  - Purpose: Generic TP handler (fallback)
  - Current: We have specific `notify-tp1-hit` through `notify-tp5-hit`
  - Recommendation: **KEEP for now** as fallback in SQL trigger

### ✅ **KEEP - Other Essential Systems**
These are unrelated to signal stream but still needed:
- `account-request-notifications` ✅ KEEP
- `account-request-rate-limit` ✅ KEEP
- `account-status-check` ✅ KEEP
- `account-status-websocket` ✅ KEEP
- `admin-user-management` ✅ KEEP
- `ai-trade-analysis` ✅ KEEP
- `check-user-existence` ✅ KEEP
- `cleanup-old-data` ✅ KEEP
- `coach-agent` ✅ KEEP
- `deconstructor-agent` ✅ KEEP
- `economic-calendar` ✅ KEEP
- `file-upload` ✅ KEEP
- `generate-zoom-jwt` ✅ KEEP
- `get-historical-data` ✅ KEEP
- `hello` ✅ KEEP (health check)
- `ingest-secret-verifier` ✅ KEEP
- `migrate-approved-accounts` ✅ KEEP
- `notification-cleanup` ✅ KEEP
- `posthog-config` ✅ KEEP
- `rate-limit-websocket` ✅ KEEP
- `register-device-token` ✅ KEEP
- `reset` ✅ KEEP
- `send-welcome-email` ✅ KEEP
- `share-trade-signal` ✅ KEEP
- `simplified-signup` ✅ KEEP
- `trading-journal-ai-coach-gemeni` ✅ KEEP
- `unified-account-approval` ✅ KEEP

---

## 🗑️ **FUNCTIONS TO DELETE** (4 total)

1. **`enhanced-signal-notification-dispatcher`**
   - Reason: Old monolithic notification system (replaced by new system)
   - Last used: Before PR #178
   - Status: No longer called by any code

2. **`signal-notification-dispatcher`**
   - Reason: Even older notification system
   - Last used: Long time ago
   - Status: No longer called by any code

3. **`price-monitoring`**
   - Reason: Old notification trigger (replaced by database trigger + new Edge Functions)
   - Last used: Before PR #178
   - Status: No longer called by any code

4. **`test-notification`**
   - Reason: Testing/debugging only
   - Status: Not used in production

---

## 📝 **CLEANUP ACTIONS**

### **Step 1: Delete Edge Function Directories**
```bash
rm -rf enhanced-signal-notification-dispatcher/
rm -rf signal-notification-dispatcher/
rm -rf price-monitoring/
rm -rf test-notification/
```

### **Step 2: Update `config.toml`**
Remove these entries:
```toml
[functions.enhanced-signal-notification-dispatcher]
[functions.price-monitoring]
[functions.test-notification]
```

**KEEP** `notify-tp-hit` as fallback in config.toml

---

## ✅ **POST-CLEANUP VERIFICATION**

After cleanup, the notification flow will be:
```
Database Trigger (instant_notification_router)
    ↓
Routes to specific Edge Functions:
    - notify-signal-created
    - notify-tp1-hit (or tp2, tp3, tp4, tp5)
    - notify-stop-loss-hit
    - notify-limit-activated
    - notify-signal-closed
    - notify-notes-updated
    ↓
notification-core.ts (sendRealtimeNotification)
    ↓
Supabase Realtime (instant-alerts channel)
    ↓
ModernNotificationSystem (frontend)
```

✅ **Clean, single-path notification system!**

---

## 🚀 **READY TO EXECUTE**

