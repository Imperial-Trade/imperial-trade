# ✅ VPS Network Fix - Ready to Execute

## 📋 Summary

All fixes have been prepared. The VPS needs to be updated to:
1. ✅ Listen on `0.0.0.0` instead of `localhost`
2. ✅ Allow Windows Firewall port 3001
3. ✅ Restart PM2 service

## 🚀 Quick Execution (3 Options)

### Option 1: Copy-Paste PowerShell Script (Easiest)

**Connect to your VPS:**
- IP: `45.32.89.134`
- User: `Administrator`
- Password: `2#bWj}tv=}5d}u5}`

**Then copy and paste the entire contents of `COMPLETE_FIX_SCRIPT.ps1` into PowerShell on the VPS.**

The script will automatically:
- Fix Express binding
- Rebuild service
- Configure firewall
- Restart PM2
- Verify everything works

### Option 2: Manual Commands

See `RUN_THESE_COMMANDS_ON_VPS.txt` for step-by-step commands to copy-paste.

### Option 3: Run Existing Script (If Files Copied)

If `APPLY_FIXES_NOW.ps1` is already on the VPS:

```powershell
cd C:\vps-broker-service
powershell -ExecutionPolicy Bypass -File .\APPLY_FIXES_NOW.ps1
```

## 📁 Files Ready

1. **`COMPLETE_FIX_SCRIPT.ps1`** - Complete standalone fix script (copy-paste ready)
2. **`RUN_THESE_COMMANDS_ON_VPS.txt`** - Step-by-step manual commands
3. **`vps-broker-service/src/index.ts`** - Fixed source file (already updated locally)
4. **`vps-broker-service/APPLY_FIXES_NOW.ps1`** - Automated fix script

## ✅ Verification Checklist

After running the script, verify:

- [ ] `netstat -an | findstr "3001"` shows `0.0.0.0:3001` (NOT `127.0.0.1:3001`)
- [ ] `curl http://localhost:3001/health` returns JSON with `"status":"ok"`
- [ ] `pm2 status` shows `imperial-trade-broker-service` as `online`
- [ ] External test: `curl http://45.32.89.134:3001/health` works from your machine
- [ ] Vultr firewall allows port 3001

## 🔍 Troubleshooting

### Script Fails with "Access Denied"
- Run PowerShell **as Administrator**

### Service Won't Start
- Check logs: `pm2 logs imperial-trade-broker-service`
- Verify `.env` file has `VPS_API_KEY` set

### Still Can't Connect from Edge Function
1. Check Vultr Security Groups - allow port 3001
2. Verify service is on `0.0.0.0:3001` (not `127.0.0.1:3001`)
3. Check Edge Function logs in Supabase Dashboard
4. Consider HTTPS setup if getting SSL/TLS errors

## 📞 Next Steps After Fix

1. ✅ Test connection from Journal XX Pro frontend
2. ✅ Monitor Edge Function logs
3. ✅ Verify trades sync correctly
4. ✅ Set up HTTPS/SSL for production (optional)

---

**The easiest way: Just copy `COMPLETE_FIX_SCRIPT.ps1` contents and paste into PowerShell on your VPS!** 🚀







