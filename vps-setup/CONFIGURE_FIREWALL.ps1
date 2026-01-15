# Configure Windows Firewall for VPS Broker Service
# Restricts port 3001 to Supabase Edge Function IP ranges
# Run as Administrator

Write-Host "🔥 Configuring Windows Firewall for Broker Service" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This script must be run as Administrator" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Supabase Edge Function IP Ranges
# Note: Supabase Edge Functions run on Deno Deploy, which uses Cloudflare
# These IPs can change, so this is a best-effort whitelist
# You may need to update these periodically or use Supabase's published IP ranges
$supabaseIPs = @(
    # Cloudflare IP ranges (where Supabase Edge Functions run)
    "173.245.48.0/20",      # Cloudflare
    "103.21.244.0/22",      # Cloudflare
    "103.22.200.0/22",      # Cloudflare
    "103.31.4.0/22",        # Cloudflare
    "141.101.64.0/18",      # Cloudflare
    "108.162.192.0/18",     # Cloudflare
    "190.93.240.0/20",      # Cloudflare
    "188.114.96.0/20",      # Cloudflare
    "197.234.240.0/22",     # Cloudflare
    "198.41.128.0/17",      # Cloudflare
    "162.158.0.0/15",       # Cloudflare
    "104.16.0.0/13",        # Cloudflare
    "104.24.0.0/14",        # Cloudflare
    "172.64.0.0/13",        # Cloudflare
    "131.0.72.0/22"         # Cloudflare
)

# Alternative: Allow all traffic (for testing - REMOVE IN PRODUCTION)
# For production, use the IP ranges above
$allowAll = $false  # Set to $true for testing only

$port = 3001
$ruleName = "Imperial Trade Broker Service Port 3001"
$description = "Allow Supabase Edge Functions to access VPS Broker Service on port 3001"

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Port: $port" -ForegroundColor White
Write-Host "  Rule Name: $ruleName" -ForegroundColor White
Write-Host ""

# Remove existing rule if it exists
Write-Host "Step 1: Removing existing rule (if any)..." -ForegroundColor Cyan
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existingRule) {
    Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    Write-Host "✅ Removed existing rule" -ForegroundColor Green
} else {
    Write-Host "No existing rule found" -ForegroundColor Gray
}
Write-Host ""

# Create new firewall rule
Write-Host "Step 2: Creating firewall rule..." -ForegroundColor Cyan

if ($allowAll) {
    Write-Host "⚠️  WARNING: Creating rule that allows ALL IPs (for testing only!)" -ForegroundColor Yellow
    New-NetFirewallRule `
        -DisplayName $ruleName `
        -Description $description `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort $port `
        -Action Allow `
        -Enabled True `
        -Profile Any | Out-Null
    Write-Host "✅ Rule created (ALLOWING ALL IPs - NOT RECOMMENDED FOR PRODUCTION)" -ForegroundColor Yellow
} else {
    Write-Host "Creating rule with Supabase IP ranges..." -ForegroundColor Yellow
    
    # Create rule for each IP range
    $ruleIndex = 1
    foreach ($ipRange in $supabaseIPs) {
        $individualRuleName = "$ruleName - Range $ruleIndex"
        New-NetFirewallRule `
            -DisplayName $individualRuleName `
            -Description "$description - IP Range: $ipRange" `
            -Direction Inbound `
            -Protocol TCP `
            -LocalPort $port `
            -RemoteAddress $ipRange `
            -Action Allow `
            -Enabled True `
            -Profile Any | Out-Null
        Write-Host "  ✅ Added rule for $ipRange" -ForegroundColor Green
        $ruleIndex++
    }
    
    Write-Host ""
    Write-Host "✅ Created $($supabaseIPs.Count) firewall rules for Supabase IP ranges" -ForegroundColor Green
}

Write-Host ""

# Verify rules
Write-Host "Step 3: Verifying firewall rules..." -ForegroundColor Cyan
$rules = Get-NetFirewallRule -DisplayName "$ruleName*" | Where-Object { $_.Enabled -eq $true }
Write-Host "Found $($rules.Count) active rule(s)" -ForegroundColor Green
Write-Host ""

# Display rules
Write-Host "Active Firewall Rules:" -ForegroundColor Cyan
foreach ($rule in $rules) {
    $addressFilter = (Get-NetFirewallAddressFilter -AssociatedNetFirewallRule $rule).RemoteAddress
    Write-Host "  - $($rule.DisplayName)" -ForegroundColor White
    Write-Host "    Remote Address: $addressFilter" -ForegroundColor Gray
    Write-Host "    Protocol: TCP" -ForegroundColor Gray
    Write-Host "    Local Port: $port" -ForegroundColor Gray
    Write-Host "    Action: Allow" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "✅ Firewall Configuration Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Important Notes:" -ForegroundColor Yellow
Write-Host "   - Supabase Edge Functions run on Cloudflare infrastructure" -ForegroundColor White
Write-Host "   - IP ranges may change - monitor and update periodically" -ForegroundColor White
Write-Host "   - For maximum security, also verify API key on service level" -ForegroundColor White
Write-Host "   - You can check current Supabase Edge Function IPs at:" -ForegroundColor White
Write-Host "     https://api.cloudflare.com/client/v4/ips" -ForegroundColor Cyan
Write-Host ""

# Alternative approach: Allow only from your Supabase project IP
Write-Host "💡 Alternative Approach:" -ForegroundColor Cyan
Write-Host "   For simpler management, you can allow only your Supabase project's IP" -ForegroundColor White
Write-Host "   Check your Supabase dashboard for the project's specific IP range" -ForegroundColor White
Write-Host "   Then update this script to use that specific IP range" -ForegroundColor White
Write-Host ""
