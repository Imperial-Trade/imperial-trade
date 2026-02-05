# ⚡ Quick Fix - Run These Commands on VPS

## Copy and paste these commands into PowerShell on your VPS:

```powershell
# 1. Navigate to service directory
cd C:\vps-broker-service

# 2. Edit index.ts to fix 0.0.0.0 binding
# Find line 281 and change:
# OLD: app.listen(PORT, () => {
# NEW: app.listen(PORT, '0.0.0.0', () => {
(Get-Content src\index.ts) -replace "app\.listen\(PORT,\s*\(\)\s*=>", "app.listen(PORT, '0.0.0.0', () =>" | Set-Content src\index.ts

# 3. Rebuild
npm run build

# 4. Configure Windows Firewall (run as Administrator)
New-NetFirewallRule -DisplayName "JournalAPI-Port3001" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow

# 5. Restart PM2
pm2 stop imperial-trade-broker-service
pm2 delete imperial-trade-broker-service
pm2 start "dist\index.js" --name imperial-trade-broker-service --cwd "C:\vps-broker-service"
pm2 save

# 6. Verify it's listening on 0.0.0.0
netstat -an | findstr "3001"

# 7. Test
curl http://localhost:3001/health
```

## Check Results:

```powershell
# Should show: TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING
netstat -an | findstr "3001"

# Should return JSON with status: ok
curl http://localhost:3001/health
```







