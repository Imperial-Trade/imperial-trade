# ⚡ Execute Now - Copy & Paste

## 🚀 On Windows VPS (PowerShell as Administrator)

```powershell
cd C:\vps-broker-service
.\vps-setup\DEPLOY_NOW_SAFE.ps1
```

**Wait for completion**, then verify:

```powershell
pm2 list
```

**Both services should show "online"** ✅

---

## 🧪 Test Connection

**On your local machine** (frontend is already running):

1. Open: `http://localhost:5173/dashboard/journal-xx-pro`
2. Select: "EC Markets"
3. Enter:
   - Login: `800107112`
   - Password: `Demo@123`
   - Server: `ECMarketsLtd-Demo`
4. Click: "Connect Broker"

**Monitor browser console (F12) for connection status**

---

**That's it!** 🎉
