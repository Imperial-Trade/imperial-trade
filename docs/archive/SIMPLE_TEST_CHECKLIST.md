# ✅ SIMPLE TEST CHECKLIST

Print this out and check off each item as you complete it.

---

## 🔴 STEP 1: BUILD STATUS

**Link**: https://github.com/Imperial-Trade/imperial-trade/actions

- [ ] Clicked link
- [ ] Latest build shows ✅ green checkmark
- [ ] Build completed successfully

**If failed**: Share error logs with me

---

## 🔴 STEP 2: DATABASE TRIGGER

**File**: `VERIFY_TRIGGER_HAS_NOTES.sql`

- [ ] Opened Supabase Dashboard → SQL Editor
- [ ] Copied contents of `VERIFY_TRIGGER_HAS_NOTES.sql`
- [ ] Pasted and ran in SQL Editor
- [ ] Result shows: `✅ PASS: Notes field is included in trigger!`
- [ ] Shows: `Found 'notes', NEW.notes: 6 times`

**If failed (0 times found)**:
- [ ] Applied migration via CLI: `supabase db push`
- [ ] OR copied `20251115003132_*.sql` to SQL Editor and ran it
- [ ] Re-ran verification (should now show 6 times)

---

## 🔴 STEP 3: NOTIFICATION POP-UP

**Test**: Close a signal manually

- [ ] Opened app in browser
- [ ] Pressed F12 to open console
- [ ] Created signal with notes: "test"
- [ ] Closed the signal
- [ ] Upper-right pop-up appeared within 1 second
- [ ] Pop-up shows provider avatar
- [ ] Pop-up shows "Signal Closed" message
- [ ] Pop-up shows notes: "TEST" (gray, uppercase)
- [ ] Pop-up positioned below nav bar (not blocking bell)
- [ ] NO lower-left Sonner toast appeared
- [ ] Pop-up auto-dismissed after 8 seconds

**Console logs showed**:
- [ ] `🚨 [ModernNotificationSystem] Received signal notification`
- [ ] `✅ [DIAGNOSTIC] Notification APPROVED`
- [ ] `📝 [ModernNotificationSystem] Adding to store`
- [ ] `✅ [ModernNotificationSystem] Added to store successfully`
- [ ] `💾 [NotificationStore] SAVED to localStorage`

---

## 🔴 STEP 4: RECENT ACTIVITY

**Test**: Check notification storage

- [ ] Clicked bell icon
- [ ] Recent Activity panel opened
- [ ] Shows the closed signal notification
- [ ] Main message: "Gold closed manually" (or your asset)
- [ ] Notes shown below: "TEST" (gray, uppercase, small)
- [ ] Timestamp shows correctly

---

## 🔴 STEP 5: PERSISTENCE

**Test**: Logout and login

- [ ] Closed 3 different signals (waited 2 sec between each)
- [ ] Recent Activity shows 3 notifications
- [ ] Logged out
- [ ] Logged back in
- [ ] Console shows: `✅ [NotificationStore] LOADED from localStorage: { count: 3 }`
- [ ] Recent Activity still shows 3 notifications

**Manual check in console**:
```javascript
localStorage.getItem('imperial-trade-notifications')
```
- [ ] Returns JSON array with 3 items

---

## 🔴 STEP 6: EDGE FUNCTION

**Check**: Supabase logs

- [ ] Opened Supabase Dashboard → Edge Functions
- [ ] Clicked `notify-signal-closed`
- [ ] Clicked Logs tab
- [ ] Closed a signal in app
- [ ] Refreshed logs
- [ ] Logs show: `🔒 [Signal Closed] Processing notification`
- [ ] Logs show: `✅ Realtime notification sent`

---

## 🔴 STEP 7: REALTIME

**Check**: Console on page load

- [ ] Console shows: `📡 [Channel Status] SUBSCRIBED`
- [ ] Console shows: `✅ [Channel] Successfully subscribed to instant-alerts`

---

## ✅ FINAL CHECKLIST

**All systems operational**:

- [ ] Build passed
- [ ] Database trigger has notes (6 occurrences)
- [ ] Pop-up appears and shows notes
- [ ] Recent Activity shows notifications
- [ ] Notifications persist after logout/login
- [ ] Edge function logs show activity
- [ ] Realtime connected

---

## 🎉 RESULT

**If all checked**: ✅ **SYSTEM FULLY OPERATIONAL!**

**If any unchecked**: Share which step failed and I'll help troubleshoot.

---

## 📞 NEED HELP?

Share with me:
1. Which step(s) failed (number)
2. Console logs (copy/paste)
3. SQL verification output
4. Edge Function logs
5. Screenshots

---

**Print this checklist and mark off each item as you test!**

