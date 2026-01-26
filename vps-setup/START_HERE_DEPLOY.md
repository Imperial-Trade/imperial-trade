# 🚀 START HERE - Deploy and Test

## ✅ Pre-Flight Check

**Everything Verified**:
- ✅ VPS service code: Built successfully
- ✅ Edge Functions: Deployed (test-broker-connection, sync-broker-trades)
- ✅ Secrets: Configured (VPS_MT5_SERVICE_URL, VPS_API_KEY)
- ✅ Frontend: Ready with MT5 account info display

---

## 🚀 DEPLOY NOW (On Windows VPS)

### Step 1: Open PowerShell as Administrator

**Right-click PowerShell → "Run as Administrator"**

### Step 2: Run This Command

```powershell
cd C:\vps-broker-service && .\vps-setup\DEPLOY_NOW_SAFE.ps1
```

**Wait 1-2 minutes for completion**

### Step 3: Verify

```powershell
pm2 list
```

**Both should show "online"** ✅

---

## 🧪 TEST CONNECTION (On Your Local Machine)

### Step 1: Open Browser

Navigate to: `http://localhost:5173/dashboard/journal-xx-pro`

### Step 2: Connect Broker

1. Select: **"EC Markets"**
2. Enter:
   - **Login**: `800107112`
   - **Password**: `Demo@123`
   - **Server**: `ECMarketsLtd-Demo`
3. Click: **"Connect Broker"**

### Step 3: Monitor

**Watch for**:
- ✅ Status message: `✅ Connected to MT5 Account 800107112 on ECMarketsLtd-Demo. Balance: 1,129.46 USD`
- ✅ Toast notification with account details
- ✅ Browser console (F12) shows account info
- ✅ Trades appear in journal

---

## ✅ Success Indicators

**You'll know it's working when you see**:

1. **Status Message**:
   ```
   ✅ Connected to MT5 Account 800107112 on ECMarketsLtd-Demo. Balance: 1,129.46 USD
   ```

2. **Toast Notification**:
   ```
   Broker Connected ✅
   MT5 Account 800107112 connected on ECMarketsLtd-Demo. Balance: 1,129.46 USD
   ```

3. **Browser Console**:
   ```
   ✅ MT5 Connection Successful: {
     login: 800107112,
     server: "ECMarketsLtd-Demo",
     balance: 1129.46,
     currency: "USD"
   }
   ```

4. **Network Tab**:
   - `test-broker-connection`: Status 200 ✅
   - Response contains `account_info` ✅

---

## 🐛 If Something Fails

**Quick Checks**:
1. VPS service running? → `pm2 list` on VPS
2. MT5 terminal open? → Check VPS desktop
3. "Allow Algorithmic Trading" enabled? → Check MT5 settings
4. Credentials correct? → Verify login/password/server

**See**: `vps-setup/DEBUG_CONNECTION_ISSUES.md` for detailed troubleshooting

---

## 📝 Files Reference

- **Deploy Script**: `vps-setup/DEPLOY_NOW_SAFE.ps1`
- **Copy-Paste Guide**: `vps-setup/COPY_PASTE_DEPLOY.txt`
- **Complete Guide**: `vps-setup/DEPLOY_AND_TEST_NOW.md`
- **Debug Guide**: `vps-setup/DEBUG_CONNECTION_ISSUES.md`

---

**Ready to deploy!** 🚀

Run the deployment script on your VPS and test the connection!
