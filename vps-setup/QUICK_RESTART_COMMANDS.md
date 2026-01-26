# ⚡ Quick Restart Commands

## If Script File Doesn't Appear

**Run these commands directly in PowerShell on the VPS:**

### Copy and Paste This Entire Block:

```powershell
# Close MT5
taskkill /F /IM terminal64.exe

# Wait
Start-Sleep -Seconds 3

# Delete AppData folder
Remove-Item -Path "C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075" -Recurse -Force -ErrorAction SilentlyContinue

# Start MT5 in portable mode
Start-Process "C:\MT5_BrokerService\terminal64.exe" -ArgumentList "/portable"

# Wait for MT5 to start
Start-Sleep -Seconds 5

Write-Host "✅ MT5 restarted!" -ForegroundColor Green
Write-Host "Check: File > Open Data Folder should show C:\MT5_BrokerService" -ForegroundColor Cyan
```

## Steps

1. **Open PowerShell as Administrator** on the VPS
2. **Copy the entire block above**
3. **Paste into PowerShell** and press Enter
4. **Wait** for MT5 to restart
5. **Check MT5**: File > Open Data Folder

## Verification

After MT5 restarts:
- Go to: **File > Open Data Folder**
- Should show: `C:\MT5_BrokerService`
- If it shows `AppData\Roaming`, run the commands again

---

**This is the fastest way - just copy and paste!**
