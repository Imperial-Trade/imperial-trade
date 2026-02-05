# ✅ VPS Network Setup - Ready to Execute

## 📋 What's Been Prepared

All fixes have been prepared and are ready to deploy:

1. ✅ **Express Server Fix**: `vps-broker-service/src/index.ts` - Changed to listen on `0.0.0.0`
2. ✅ **CORS Configuration**: Enhanced to allow Edge Function calls
3. ✅ **Firewall Script**: `APPLY_FIXES_NOW.ps1` - Complete automated fix script
4. ✅ **Deployment Guide**: Step-by-step instructions

## 🚀 Quick Start - Run This Now

### Step 1: Connect to VPS

**Option A: Via SSH (if OpenSSH is installed):**
```bash
ssh Administrator@45.32.89.134
# Password: 2#bWj}tv=}5d}u5}
```

**Option B: Via RDP (Remote Desktop):**
- IP: `45.32.89.134`
- Username: `Administrator`
- Password: `2#bWj}tv=}5d}u5}`

### Step 2: Copy Files (If Not Already There)

The files should already be on your VPS if scp succeeded. If not:

**Option A: Copy from this machine:**
```bash
# From your local machine
scp vps-broker-service/src/index.ts Administrator@45.32.89.134:C:/vps-broker-service/src/
scp vps-broker-service/APPLY_FIXES_NOW.ps1 Administrator@45.32.89.134:C:/vps-broker-service/
```

**Option B: Manual Fix:**
If files aren't copied, you can manually edit `src/index.ts` on line 287:
- Change: `app.listen(PORT, () => {`
- To: `app.listen(PORT, '0.0.0.0', () => {`

### Step 3: Execute the Fix Script

**On the VPS, open PowerShell and run:**
```powershell
cd C:\vps-broker-service
powershell -ExecutionPolicy Bypass -File .\APPLY_FIXES_NOW.ps1
```

**Or if running as Administrator:**
```powershell
cd C:\vps-broker-service
.\APPLY_FIXES_NOW.ps1
```

The script will:
- ✅ Fix Express server binding to 0.0.0.0
- ✅ Rebuild the TypeScript service
- ✅ Configure Windows Firewall for port 3001
- ✅ Restart PM2 service
- ✅ Verify everything is working
- ✅ Show you the external IP for Supabase secrets

### Step 4: Verify Everything Works

After the script runs, verify:

```powershell
# 1. Check service is listening on 0.0.0.0
netstat -an | findstr "3001"
# Should show: TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING

# 2. Test health endpoint
curl http://localhost:3001/health
# Should return: {"status":"ok","service":"imperial-trade-broker-service",...}

# 3. Check PM2 status
pm2 status
# Should show: imperial-trade-broker-service | online
```

## 📝 Manual Steps (If Script Doesn't Work)

If the automated script fails, run these manually:

```powershell
cd C:\vps-broker-service

# 1. Fix Express binding
# Edit src\index.ts line 287 to: app.listen(PORT, '0.0.0.0', () => {

# 2. Rebuild
npm run build

# 3. Configure Firewall (as Administrator)
New-NetFirewallRule -DisplayName "JournalAPI-Port3001" `
    -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow

# 4. Restart PM2
pm2 stop imperial-trade-broker-service
pm2 delete imperial-trade-broker-service
pm2 start "dist\index.js" --name imperial-trade-broker-service --cwd "C:\vps-broker-service"
pm2 save

# 5. Test
netstat -an | findstr "3001"
curl http://localhost:3001/health
```

## 🔍 Troubleshooting

### Script Fails with "Access Denied"
- Run PowerShell as Administrator
- Or manually configure firewall (Step 3 above)

### Service Won't Start
- Check PM2 logs: `pm2 logs imperial-trade-broker-service`
- Verify build succeeded: `ls dist/index.js`
- Check .env file exists and has VPS_API_KEY

### Still Can't Connect from Edge Function
1. **Check Vultr Firewall:**
   - Log into Vultr dashboard
   - Go to: Server → Firewall → Inbound Rules
   - Add rule: TCP port 3001, source 0.0.0.0/0

2. **Verify Service is Listening:**
   ```powershell
   netstat -an | findstr "3001"
   # Must show 0.0.0.0:3001, NOT 127.0.0.1:3001
   ```

3. **Test External Access:**
   ```bash
   # From your local machine
   curl http://45.32.89.134:3001/health
   ```

4. **Check HTTPS/HTTP Issue:**
   - If Edge Function logs show SSL/TLS errors
   - Set up ngrok or nginx for HTTPS (see below)

## 🔒 HTTPS/SSL Setup (If Needed)

If Edge Function can't connect due to HTTPS/HTTP mixed content:

### Quick Testing: ngrok
```powershell
# On VPS
# Download ngrok from https://ngrok.com/download
ngrok http 3001
# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update Supabase secret: VPS_MT5_SERVICE_URL = https://abc123.ngrok.io
```

### Production: nginx + Let's Encrypt
See `COMPLETE_NETWORK_FIX_GUIDE.md` for detailed instructions.

## ✅ Success Checklist

After setup, verify:
- [ ] Service is listening on `0.0.0.0:3001` (not `127.0.0.1:3001`)
- [ ] Windows Firewall rule exists and is enabled
- [ ] Local health check works: `curl http://localhost:3001/health`
- [ ] External health check works: `curl http://45.32.89.134:3001/health`
- [ ] PM2 service is running: `pm2 status`
- [ ] Vultr firewall allows port 3001
- [ ] Supabase secret `VPS_MT5_SERVICE_URL` is correct
- [ ] Edge Function can connect (check logs in Supabase Dashboard)

## 📞 Next Steps

1. ✅ Execute the fix script on VPS
2. ✅ Verify all checklist items above
3. ✅ Test connection from Journal XX Pro frontend
4. ✅ Monitor Edge Function logs for any errors
5. ✅ Set up HTTPS/SSL for production (optional but recommended)

---

**All files are ready. Just connect to your VPS and run the script!** 🚀







