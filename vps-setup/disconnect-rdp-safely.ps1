# Disconnect RDP While Keeping Session Active
# Prevents MT5 GUI applications from freezing when RDP is closed
# Run as Administrator before closing RDP window

Write-Host "🖥️  Disconnecting RDP Safely..." -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
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

# Get current session ID
$currentSessionId = (Get-Process -Id $PID).SessionId
Write-Host "Current Session ID: $currentSessionId" -ForegroundColor Cyan
Write-Host ""

# Get session name
Write-Host "Step 1: Getting session information..." -ForegroundColor Cyan
try {
    # Query user sessions
    $quserOutput = quser 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to query user sessions" -ForegroundColor Red
        Write-Host "   Error: $quserOutput" -ForegroundColor Yellow
        exit 1
    }
    
    # Parse session name from quser output
    $sessionLine = $quserOutput | Select-String -Pattern "\s+$currentSessionId\s+" | Select-Object -First 1
    
    if (-not $sessionLine) {
        Write-Host "⚠️  Could not find current session in quser output" -ForegroundColor Yellow
        Write-Host "   Attempting alternative method..." -ForegroundColor Yellow
        
        # Alternative: Use session name from environment
        $sessionName = $env:SESSIONNAME
        if ($sessionName) {
            Write-Host "✅ Found session name from environment: $sessionName" -ForegroundColor Green
        } else {
            Write-Host "❌ Could not determine session name" -ForegroundColor Red
            Write-Host ""
            Write-Host "Manual Instructions:" -ForegroundColor Yellow
            Write-Host "1. Run: quser" -ForegroundColor White
            Write-Host "2. Find your session ID in the output" -ForegroundColor White
            Write-Host "3. Run: tscon.exe [SESSION_ID] /dest:console" -ForegroundColor White
            exit 1
        }
    } else {
        # Extract session name from quser output (format: USERNAME SESSIONNAME ...)
        $sessionParts = $sessionLine.ToString().Trim() -split '\s+'
        $sessionName = $sessionParts[1]
        Write-Host "✅ Found session name: $sessionName" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Error getting session information: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual Instructions:" -ForegroundColor Yellow
    Write-Host "1. Run: quser" -ForegroundColor White
    Write-Host "2. Find your session ID in the output" -ForegroundColor White
    Write-Host "3. Run: tscon.exe [SESSION_ID] /dest:console" -ForegroundColor White
    exit 1
}

Write-Host ""

# Disconnect from RDP while keeping session active
Write-Host "Step 2: Disconnecting from RDP..." -ForegroundColor Cyan
Write-Host "   Session: $sessionName" -ForegroundColor White
Write-Host "   This will disconnect you from RDP but keep the session active" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Continue? (y/N)"

if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "⏭️  Cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Disconnecting..." -ForegroundColor Yellow

try {
    # Use tscon.exe to disconnect RDP and keep session active
    $tsconOutput = & tscon.exe $sessionName /dest:console 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully disconnected from RDP!" -ForegroundColor Green
        Write-Host "   Your session remains active and GUI applications will continue running." -ForegroundColor Green
        Write-Host "   MT5 terminals should continue working normally." -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to disconnect: $tsconOutput" -ForegroundColor Red
        Write-Host ""
        Write-Host "Manual Command:" -ForegroundColor Yellow
        Write-Host "   tscon.exe $sessionName /dest:console" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host "❌ Error executing tscon.exe: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "tscon.exe may not be available. Try:" -ForegroundColor Yellow
    Write-Host "   1. Ensure you're running Windows Server or Pro edition" -ForegroundColor White
    Write-Host "   2. Run from Command Prompt (cmd) instead of PowerShell" -ForegroundColor White
    Write-Host "   3. Manual command: tscon.exe $sessionName /dest:console" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Cyan
Write-Host "   - PM2 services will continue running" -ForegroundColor White
Write-Host "   - MT5 terminals will remain active" -ForegroundColor White
Write-Host "   - Auto-sync will continue working" -ForegroundColor White
Write-Host "   - You can reconnect via RDP anytime" -ForegroundColor White
Write-Host ""
