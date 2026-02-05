# 🚀 Execute Network Fixes on VPS

## Quick Execution

Since I've prepared all the fixes, here's how to execute them on your VPS:

### Option 1: Run the Automated Script (Easiest)

1. **Connect to your VPS** (via RDP or SSH):
   ```
   ssh Administrator@45.32.89.134
   ```

2. **Navigate to service directory:**
   ```powershell
   cd C:\vps-broker-service
   ```

3. **Run the fix script:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\APPLY_FIXES_NOW.ps1
   ```

The script will:
- ✅ Fix Express server to listen on 0.0.0.0
- ✅ Rebuild the TypeScript service
- ✅ Configure Windows Firewall for port 3001
- ✅ Restart PM2 service
- ✅ Verify everything is working

### Option 2: Manual Step-by-Step

If the script doesn't work, run these commands manually:

```powershell
# 1. Navigate to service
cd C:\vps-broker-service

# 2. Fix Express binding (if not already fixed)
# Edit src\index.ts line 287:
# Change: app.listen(PORT, () => {
# To: app.listen(PORT, '0.0.0.0', () => {

# 3. Rebuild
npm run build

# 4. Configure Firewall (run PowerShell as Administrator)
New-NetFirewallRule -DisplayName "JournalAPI-Port3001" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow

# 5. Restart PM2
pm2 stop imperial-trade-broker-service
pm2 delete imperial-trade-broker-service
pm2 start "dist\index.js" --name imperial-trade-broker-service --cwd "C:\vps-broker-service"
pm2 save

# 6. Verify
netstat -an | findstr "3001"
curl http://localhost:3001/health
```

## Files Already Prepared

✅ `vps-broker-service/src/index.ts` - Fixed to listen on 0.0.0.0
✅ `vps-broker-service/APPLY_FIXES_NOW.ps1` - Complete automated fix script

These files should already be on your VPS if the scp commands succeeded.

## Verification

After running the fixes, verify:

1. **Service is listening on 0.0.0.0:**
   ```powershell
   netstat -an | findstr "3001"
   # Should show: TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING
   ```

2. **Health check works:**
   ```powershell
   curl http://localhost:3001/health
   # Should return JSON with status: ok
   ```

3. **PM2 service is running:**
   ```powershell
   pm2 status
   # Should show imperial-trade-broker-service as online
   ```

## Next Steps After Fixes

1. ✅ Update Supabase secret `VPS_MT5_SERVICE_URL` if your IP changed
2. ✅ Verify Vultr firewall allows port 3001
3. ✅ Test connection from Journal XX Pro frontend
4. ✅ Check Edge Function logs in Supabase Dashboard







