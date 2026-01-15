# Comprehensive MT5 IPC Timeout Fix Script
# Based on MT5 troubleshooting best practices

Write-Host "=========================================="
Write-Host "MT5 IPC Timeout Fix - Comprehensive Setup"
Write-Host "=========================================="
Write-Host ""

$mt5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"
$mt5ConfigPath = "$env:APPDATA\MetaQuotes\Terminal"

# Step 1: Check if MT5 is running
Write-Host "[1/6] Checking MT5 process..."
$mt5Process = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $mt5Path }
if ($mt5Process) {
    Write-Host "   ✅ Generic MT5 is running (PID: $($mt5Process.Id))"
} else {
    Write-Host "   ⚠️  Generic MT5 is not running"
    Write-Host "   Starting Generic MT5 as Administrator..."
    Start-Process -FilePath $mt5Path -Verb RunAs -WindowStyle Normal
    Start-Sleep -Seconds 10
}

# Step 2: Check Windows Firewall
Write-Host ""
Write-Host "[2/6] Checking Windows Firewall..."
$firewallRule = Get-NetFirewallRule -DisplayName "*MetaTrader*" -ErrorAction SilentlyContinue
if ($firewallRule) {
    Write-Host "   ✅ Firewall rules found for MT5"
    Get-NetFirewallRule -DisplayName "*MetaTrader*" | ForEach-Object {
        $rule = $_
        Write-Host "      - $($rule.DisplayName): $($rule.Enabled)"
    }
} else {
    Write-Host "   ⚠️  No firewall rules found for MT5"
    Write-Host "   Creating firewall rule..."
    New-NetFirewallRule -DisplayName "MetaTrader 5 - Allow All" `
        -Direction Inbound `
        -Program $mt5Path `
        -Action Allow `
        -Profile Any | Out-Null
    Write-Host "   ✅ Firewall rule created"
}

# Step 3: Check MT5 Configuration Directory
Write-Host ""
Write-Host "[3/6] Checking MT5 configuration..."
if (Test-Path $mt5ConfigPath) {
    Write-Host "   ✅ MT5 config directory exists: $mt5ConfigPath"
    $configFiles = Get-ChildItem -Path $mt5ConfigPath -Recurse -Filter "*.ini" -ErrorAction SilentlyContinue
    Write-Host "   Found $($configFiles.Count) config files"
} else {
    Write-Host "   ⚠️  MT5 config directory not found (will be created on first run)"
}

# Step 4: Verify MT5 Settings (Manual Check Required)
Write-Host ""
Write-Host "[4/6] MT5 Settings Verification (Manual Check Required)"
Write-Host "   Please verify in MT5:"
Write-Host "   1. Tools > Options > Expert Advisors"
Write-Host "      ✅ 'Allow algorithmic trading' MUST be checked"
Write-Host "   2. Tools > Options > Expert Advisors"
Write-Host "      ✅ 'Allow DLL imports' should be checked (if needed)"
Write-Host "   3. Tools > Options > Server"
Write-Host "      ✅ Verify server connection is stable (green bars)"

# Step 5: Check for Administrator Rights
Write-Host ""
Write-Host "[5/6] Checking Administrator Rights..."
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    Write-Host "   ✅ Running as Administrator"
} else {
    Write-Host "   ⚠️  NOT running as Administrator"
    Write-Host "   Recommendation: Run this script as Administrator"
    Write-Host "   Right-click PowerShell > Run as Administrator"
}

# Step 6: Test Python MT5 Connection
Write-Host ""
Write-Host "[6/6] Testing Python MT5 Connection..."
Write-Host "   Waiting 5 seconds for MT5 to fully initialize..."
Start-Sleep -Seconds 5

$testScript = @"
import sys
sys.path.insert(0, r'C:\vps-broker-service\python')
from test_connection import test_connection
result = test_connection('800107112', 'Demo@123', 'ECMarkets-MT5-Demo')
import json
print(json.dumps(result, indent=2))
"@

$testScript | Out-File -FilePath "$env:TEMP\test_mt5_connection.py" -Encoding UTF8
$result = python "$env:TEMP\test_mt5_connection.py" 2>&1

if ($result -match '"connected":\s*true') {
    Write-Host "   ✅ Connection test SUCCESSFUL!"
    Write-Host $result
} else {
    Write-Host "   ❌ Connection test FAILED"
    Write-Host $result
    Write-Host ""
    Write-Host "   Next steps:"
    Write-Host "   1. Open Generic MT5 manually"
    Write-Host "   2. Go to: Tools > Options > Expert Advisors"
    Write-Host "   3. Check 'Allow algorithmic trading'"
    Write-Host "   4. Log in manually once"
    Write-Host "   5. Keep terminal open"
}

Write-Host ""
Write-Host "=========================================="
Write-Host "Setup Complete!"
Write-Host "=========================================="









