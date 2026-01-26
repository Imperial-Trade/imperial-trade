# ============================================================================
# CREATE STATUS REPORT - Write to file for retrieval
# ============================================================================

$report = @()
$report += "════════════════════════════════════════════════════════════════"
$report += "📊 SYSTEM STATUS REPORT"
$report += "════════════════════════════════════════════════════════════════"
$report += ""
$report += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$report += ""

# Files
$report += "1. FILES:"
$files = @(
    @{Name="SUCCESSFUL_VERIFICATION.ps1"; Path="C:\vps-broker-service\vps-setup\SUCCESSFUL_VERIFICATION.ps1"},
    @{Name="DIAGNOSE_FAILURE.ps1"; Path="C:\vps-broker-service\vps-setup\DIAGNOSE_FAILURE.ps1"},
    @{Name="index.js"; Path="C:\vps-broker-service\dist\index.js"},
    @{Name="test_connection.py"; Path="C:\vps-broker-service\python\test_connection.py"},
    @{Name="MT5 terminal64.exe"; Path="C:\MT5_BrokerService\terminal64.exe"}
)

foreach ($file in $files) {
    if (Test-Path $file.Path) {
        $report += "   ✅ $($file.Name)"
    } else {
        $report += "   ❌ $($file.Name) - MISSING"
    }
}

$report += ""

# PM2
$report += "2. PM2 SERVICES:"
try {
    $pm2 = pm2 status 2>&1 | Out-String
    $report += $pm2
    if ($pm2 -match "imperial-trade-broker-service.*online") {
        $report += "   ✅ Broker Service: ONLINE"
    } else {
        $report += "   ❌ Broker Service: NOT ONLINE"
    }
} catch {
    $report += "   ❌ PM2 Error: $_"
}

$report += ""

# Port
$report += "3. PORT 3001:"
try {
    $port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
    if ($port) {
        $report += "   ✅ LISTENING"
    } else {
        $report += "   ❌ NOT LISTENING"
    }
} catch {
    $report += "   ❌ Port check error: $_"
}

$report += ""

# MT5
$report += "4. MT5 PROCESS:"
try {
    $mt5 = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*MT5_BrokerService*" }
    if ($mt5) {
        $report += "   ✅ RUNNING"
        $report += "   Path: $($mt5.Path)"
    } else {
        $report += "   ❌ NOT RUNNING"
    }
} catch {
    $report += "   ❌ MT5 check error: $_"
}

$report += ""
$report += "════════════════════════════════════════════════════════════════"

# Write to file
$reportPath = "C:\vps-broker-service\vps-setup\STATUS_REPORT.txt"
$report | Out-File -FilePath $reportPath -Encoding UTF8

Write-Host "Status report written to: $reportPath" -ForegroundColor Green
Write-Host ""
Write-Host "To view: Get-Content $reportPath" -ForegroundColor Yellow
