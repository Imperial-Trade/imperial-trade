$output = @()
$output += "=== SYSTEM STATUS ==="
$output += ""

# Files
$output += "FILES:"
if (Test-Path "C:\vps-broker-service\vps-setup\WORKING_STATUS_CHECK.ps1") { $output += "  OK: WORKING_STATUS_CHECK.ps1" } else { $output += "  MISSING: WORKING_STATUS_CHECK.ps1" }
if (Test-Path "C:\vps-broker-service\dist\index.js") { $output += "  OK: index.js" } else { $output += "  MISSING: index.js" }
if (Test-Path "C:\MT5_BrokerService\terminal64.exe") { $output += "  OK: MT5 terminal64.exe" } else { $output += "  MISSING: MT5 terminal64.exe" }

$output += ""

# PM2
$output += "PM2:"
$pm2 = pm2 status 2>&1 | Out-String
$output += $pm2

# Port
$output += "PORT 3001:"
$p = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($p) { $output += "  OK: LISTENING" } else { $output += "  NOT LISTENING" }

# MT5
$output += "MT5:"
$m = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*MT5_BrokerService*" }
if ($m) { $output += "  OK: RUNNING" } else { $output += "  NOT RUNNING" }

$output += ""
$output += "=== END ==="

# Write to file AND console
$file = "C:\vps-broker-service\vps-setup\STATUS_OUTPUT.txt"
$output | Out-File -FilePath $file -Encoding UTF8
$output | Write-Host

exit 0
