# 🚀 DEPLOY EDGE FUNCTIONS - 3 EASY OPTIONS

## ⚠️ CRITICAL: You Must Deploy These Functions for Windows Notifications to Work

The fix for Windows Notification Center is in `_shared/notification-core.ts`, which is used by 11 Edge Functions. These functions **MUST** be redeployed for the fix to take effect.

---

## ✅ OPTION 1: PowerShell Script (Easiest - Recommended)

### Step 1: Open PowerShell
- Press `Win + X`
- Click "Windows PowerShell" or "Terminal"

### Step 2: Navigate to Project
```powershell
cd "C:\Users\Jacob Estayo\Trade imperial\imperial-trade"
```

### Step 3: Run Deployment Script
```powershell
.\deploy-notification-functions.ps1
```

**Expected Output**:
```
🚀 Starting deployment of notification Edge Functions...
✅ Supabase CLI found: 1.x.x

[1/11] Deploying notify-signal-created...
    ✅ notify-signal-created deployed successfully

[2/11] Deploying notify-limit-activated...
    ✅ notify-limit-activated deployed successfully

... (continues for all 11 functions) ...

🎉 ALL EDGE FUNCTIONS DEPLOYED SUCCESSFULLY!
```

**Duration**: ~3-5 minutes

---

## ✅ OPTION 2: Manual Deployment (One by One)

### Step 1: Open PowerShell
```powershell
cd "C:\Users\Jacob Estayo\Trade imperial\imperial-trade"
```

### Step 2: Deploy Each Function
```powershell
supabase functions deploy notify-signal-created --no-verify-jwt
supabase functions deploy notify-limit-activated --no-verify-jwt
supabase functions deploy notify-tp-hit --no-verify-jwt
supabase functions deploy notify-tp1-hit --no-verify-jwt
supabase functions deploy notify-tp2-hit --no-verify-jwt
supabase functions deploy notify-tp3-hit --no-verify-jwt
supabase functions deploy notify-tp4-hit --no-verify-jwt
supabase functions deploy notify-tp5-hit --no-verify-jwt
supabase functions deploy notify-stop-loss-hit --no-verify-jwt
supabase functions deploy notify-signal-closed --no-verify-jwt
supabase functions deploy notify-notes-updated --no-verify-jwt
```

Wait for each command to complete before running the next one.

---

## ✅ OPTION 3: Supabase Dashboard (Visual)

### Step 1: Open Supabase Dashboard
Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions

### Step 2: For Each Function
1. Click on the function name (e.g., `notify-signal-created`)
2. Click "Deploy" button
3. Confirm deployment
4. Wait for "Deployed successfully" message
5. Repeat for all 11 functions:
   - notify-signal-created
   - notify-limit-activated
   - notify-tp-hit
   - notify-tp1-hit
   - notify-tp2-hit
   - notify-tp3-hit
   - notify-tp4-hit
   - notify-tp5-hit
   - notify-stop-loss-hit
   - notify-signal-closed
   - notify-notes-updated

---

## 🔍 Troubleshooting

### If Supabase CLI is Not Recognized:

**Install via Scoop** (Recommended):
```powershell
# Install Scoop (if not installed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**OR Download Manually**:
1. Go to https://github.com/supabase/cli/releases
2. Download latest Windows binary
3. Extract to a folder
4. Add to PATH

### If Deployment Fails:

**Check you're linked to the correct project**:
```powershell
supabase link --project-ref kmuoqkcxguafxulqlbmi
```

**Re-authenticate if needed**:
```powershell
supabase login
```

---

## 🧪 Testing After Deployment

### Step 1: Clear Browser Cache
1. Open Chrome/Edge
2. Press `Ctrl + Shift + Delete`
3. Select "Cached images and files"
4. Click "Clear data"

### Step 2: Refresh Signal Stream
1. Go to https://tradeimperial.com/dashboard/signal-stream
2. Press `Ctrl + F5` (hard refresh)

### Step 3: Create Test Signal
1. Create a new BUY signal on Gold (as educator)
2. **Expected Results**:
   - ✅ Modern notification modal (upper right)
   - ✅ Recent Activity (bell icon sheet)
   - ✅ **Windows Notification Center (lower right)** 🎯

### Step 4: Verify Windows Notification Center
1. Look at **lower right corner** of Windows screen
2. You should see a notification appear there!
3. Click the notification center icon to see stored notifications

---

## 📊 What You're Deploying

### The Fix:
- **File**: `supabase/functions/_shared/notification-core.ts`
- **Key Addition**: `persist: true` (critical for Windows Notification Center)
- **Also Added**: `web_push_topic`, `chrome_web_image`, enhanced iOS/Android settings

### Impact:
- ✅ Windows Notification Center will receive ALL trade alerts
- ✅ macOS Notification Center will work better
- ✅ iOS notifications will show badge counts
- ✅ Android notifications will group properly

### Before Deployment:
- ✅ Welcome notification → Windows Notification Center
- ❌ Signal created → NOT in Windows Notification Center
- ❌ TP hits → NOT in Windows Notification Center
- ❌ Manual close → NOT in Windows Notification Center

### After Deployment:
- ✅ Welcome notification → Windows Notification Center
- ✅ **Signal created → Windows Notification Center** 🎉
- ✅ **TP hits → Windows Notification Center** 🎉
- ✅ **Manual close → Windows Notification Center** 🎉
- ✅ **ALL notifications → Windows Notification Center** 🎉

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] PowerShell script runs without errors (Option 1)
- [ ] All 11 functions show "deployed successfully"
- [ ] Browser cache cleared
- [ ] Signal Stream page refreshed
- [ ] Test signal created
- [ ] Modern notification modal appears (upper right)
- [ ] Recent Activity stores notification
- [ ] **Windows Notification Center shows notification (lower right)** 🎯
- [ ] Notification persists in Windows Notification Center
- [ ] Can click notification to open Signal Stream

---

## 🎯 Quick Start (Copy & Paste)

**Open PowerShell and run**:
```powershell
cd "C:\Users\Jacob Estayo\Trade imperial\imperial-trade"
.\deploy-notification-functions.ps1
```

That's it! The script will deploy all 11 functions automatically.

---

## 📝 Support

If you encounter any issues:

1. **Check Supabase CLI version**: `supabase --version`
2. **Check project link**: `supabase status`
3. **Check function list**: `supabase functions list`
4. **View function logs**: `supabase functions logs notify-signal-created`

---

**🎉 Once deployed, Windows Notification Center will work perfectly!**

**Questions? Check the full documentation in `WINDOWS_NOTIFICATION_FIX_v1.0.20.md`**

