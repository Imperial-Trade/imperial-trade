# Verify and Configure Windows Firewall for MT5 Broker Service
# Run this script on the VPS as Administrator

Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔥 WINDOWS FIREWALL CONFIGURATION FOR MT5 BROKER SERVICE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Check if port 3001 firewall rule exists
Write-Host "🔍 Checking for existing firewall rule on port 3001..." -ForegroundColor Yellow
$existingRule = Get-NetFirewallRule -DisplayName "MT5 Broker Service" -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "✅ Firewall rule 'MT5 Broker Service' already exists" -ForegroundColor Green
    
    # Check if it's enabled
    $ruleEnabled = ($existingRule | Get-NetFirewallPortFilter).LocalPort -eq 3001
    if ($ruleEnabled) {
        Write-Host "✅ Rule is configured for port 3001" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Rule exists but may not be configured correctly" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  No firewall rule found for port 3001" -ForegroundColor Yellow
    Write-Host "   Creating new firewall rule..." -ForegroundColor Yellow
    
    try {
        New-NetFirewallRule -DisplayName "MT5 Broker Service" `
            -Direction Inbound `
            -LocalPort 3001 `
            -Protocol TCP `
            -Action Allow `
            -Description "Allows inbound connections to MT5 Broker Service on port 3001" `
            -ErrorAction Stop
        
        Write-Host "✅ Firewall rule created successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ ERROR: Failed to create firewall rule" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🔍 Verifying firewall rule configuration..." -ForegroundColor Yellow

# Get the rule details
$rule = Get-NetFirewallRule -DisplayName "MT5 Broker Service" -ErrorAction SilentlyContinue
if ($rule) {
    $portFilter = $rule | Get-NetFirewallPortFilter
    $addressFilter = $rule | Get-NetFirewallAddressFilter
    
    Write-Host "   Rule Name: $($rule.DisplayName)" -ForegroundColor Cyan
    Write-Host "   Direction: $($rule.Direction)" -ForegroundColor Cyan
    Write-Host "   Action: $($rule.Action)" -ForegroundColor Cyan
    Write-Host "   Enabled: $($rule.Enabled)" -ForegroundColor Cyan
    Write-Host "   Protocol: $($portFilter.Protocol)" -ForegroundColor Cyan
    Write-Host "   Local Port: $($portFilter.LocalPort)" -ForegroundColor Cyan
    
    if ($rule.Enabled -eq $true -and $portFilter.LocalPort -eq 3001) {
        Write-Host ""
        Write-Host "✅ Firewall rule is correctly configured!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️  Firewall rule may need adjustment" -ForegroundColor Yellow
        if ($rule.Enabled -eq $false) {
            Write-Host "   Rule is disabled. Enabling..." -ForegroundColor Yellow
            Enable-NetFirewallRule -DisplayName "MT5 Broker Service"
            Write-Host "   ✅ Rule enabled" -ForegroundColor Green
        }
    }
} else {
    Write-Host "❌ ERROR: Could not find firewall rule after creation" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ FIREWALL CONFIGURATION COMPLETE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Summary:" -ForegroundColor Yellow
Write-Host "   - Port 3001 is now open for inbound TCP connections" -ForegroundColor White
Write-Host "   - The MT5 Broker Service should be accessible from external IPs" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Test the connection:" -ForegroundColor Yellow
Write-Host "   From your local machine, run:" -ForegroundColor White
Write-Host "   curl -X POST http://45.32.89.134:3001/health -H 'X-API-Key: <your-api-key>'" -ForegroundColor Cyan
Write-Host ""
