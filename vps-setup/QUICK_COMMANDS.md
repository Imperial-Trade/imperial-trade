# ⚡ Quick Commands - Copy and Paste

## If Script Doesn't Work

**Just copy and paste these commands directly into PowerShell:**

```powershell
# Close all MT5
taskkill /F /IM terminal64.exe

# Wait
Start-Sleep -Seconds 3

# Delete AppData folder
Remove-Item -Path "C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075" -Recurse -Force -ErrorAction SilentlyContinue

# Launch with /portable argument
Start-Process "C:\MT5_BrokerService\terminal64.exe" -ArgumentList "/portable"

# Wait
Start-Sleep -Seconds 5

Write-Host "✅ MT5 launched!" -ForegroundColor Green
Write-Host "Check: File > Open Data Folder should show C:\MT5_BrokerService" -ForegroundColor Cyan
```

## After Running

1. MT5 window will open
2. Go to: **File > Open Data Folder**
3. **MUST show**: `C:\MT5_BrokerService`
4. If it shows AppData, run the commands again

---

**This is the fastest way - just copy and paste!**
