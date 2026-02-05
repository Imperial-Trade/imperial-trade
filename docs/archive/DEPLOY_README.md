# 🚀 ONE-CLICK DEPLOYMENT

## ⚡ **FASTEST WAY TO DEPLOY**

Just run this **ONE COMMAND** in your PowerShell terminal:

```powershell
.\DEPLOY_NOW.ps1
```

**That's it!** The script will:
1. ✅ Install Supabase CLI (if needed)
2. ✅ Install Scoop (if needed)
3. ✅ Link to your project
4. ✅ Deploy all 11 Edge Functions
5. ✅ Fix Windows Notification Center

**Time**: ~5-7 minutes total

---

## 📋 **What This Deploys**

### Edge Functions (11 total):
- `notify-signal-created`
- `notify-limit-activated`
- `notify-tp-hit`
- `notify-tp1-hit`
- `notify-tp2-hit`
- `notify-tp3-hit`
- `notify-tp4-hit`
- `notify-tp5-hit`
- `notify-stop-loss-hit`
- `notify-signal-closed`
- `notify-notes-updated`

### The Fix:
Each function now includes **Windows Notification Center support**:
- ✅ `persist: true` - Makes notifications persist in Windows Notification Center
- ✅ `web_push_topic` - Groups notifications properly
- ✅ `chrome_web_image` - Better visual experience
- ✅ Enhanced iOS/Android settings

---

## 🧪 **Testing After Deployment**

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Refresh** Signal Stream (Ctrl+F5)
3. **Create a test signal**
4. **Check Windows Notification Center** (lower right corner)

**Expected Result**: Notification appears in Windows Notification Center! 🎉

---

## 📊 **Before vs After**

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
- ✅ **ALL notifications work!** 🎉

---

## ⚠️ **Troubleshooting**

If the script fails:

1. **Run PowerShell as Administrator**:
   - Press `Win + X`
   - Select "Windows PowerShell (Admin)"
   - Run `.\DEPLOY_NOW.ps1` again

2. **Manual deployment**:
   ```powershell
   supabase functions deploy notify-signal-created --no-verify-jwt
   # ... (repeat for all 11 functions)
   ```

3. **Check Supabase status**:
   ```powershell
   supabase status
   ```

---

## 🎯 **Quick Start**

Open PowerShell in VS Code and run:

```powershell
cd "C:\Users\Jacob Estayo\Trade imperial\imperial-trade"
.\DEPLOY_NOW.ps1
```

**Done!** Windows Notification Center will work for all users! 🚀

