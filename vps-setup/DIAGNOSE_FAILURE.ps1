# ============================================================================
# DIAGNOSE FAILURE - Find out why scripts are failing
# ============================================================================

$ErrorActionPreference = "Continue"
$VerbosePreference = "Continue"

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔍 DIAGNOSING FAILURE" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Test 1: Basic PowerShell
Write-Host "Test 1: Basic PowerShell Command" -ForegroundColor Yellow
try {
    Write-Host "  ✅ PowerShell is working" -ForegroundColor Green
} catch {
    Write-Host "  ❌ PowerShell error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: File operations
Write-Host "Test 2: File Operations" -ForegroundColor Yellow
$testFile = "C:\vps-broker-service\vps-setup\TEST_FILE.txt"
try {
    "Test" | Out-File -FilePath $testFile -Encoding UTF8 -ErrorAction Stop
    if (Test-Path $testFile) {
        Write-Host "  ✅ Can create files" -ForegroundColor Green
        Remove-Item $testFile -Force
    } else {
        Write-Host "  ❌ Cannot create files" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ❌ File operation error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 3: Check if script exists
Write-Host "Test 3: Checking Script Files" -ForegroundColor Yellow
$scripts = @(
    "C:\vps-broker-service\vps-setup\SUCCESSFUL_VERIFICATION.ps1",
    "C:\vps-broker-service\vps-setup\FIX_AND_VERIFY_EVERYTHING.ps1"
)

foreach ($script in $scripts) {
    $name = Split-Path $script -Leaf
    if (Test-Path $script) {
        $size = (Get-Item $script).Length
        Write-Host "  ✅ $name exists ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $name NOT FOUND" -ForegroundColor Red
    }
}

Write-Host ""

# Test 4: Run a simple script
Write-Host "Test 4: Running Simple Test Script" -ForegroundColor Yellow
$simpleScript = @"
Write-Host "Simple test" -ForegroundColor Green
exit 0
"@

$simpleScript | Out-File -FilePath "C:\vps-broker-service\vps-setup\SIMPLE_TEST.ps1" -Encoding UTF8
try {
    $result = powershell.exe -ExecutionPolicy Bypass -File "C:\vps-broker-service\vps-setup\SIMPLE_TEST.ps1" 2>&1
    Write-Host $result
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Simple script executed successfully" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Simple script failed - Exit Code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Exception running script: $_" -ForegroundColor Red
}

Write-Host ""

# Test 5: Check PM2
Write-Host "Test 5: Checking PM2" -ForegroundColor Yellow
try {
    $pm2 = pm2 status 2>&1
    if ($pm2) {
        Write-Host "  ✅ PM2 is accessible" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  PM2 output is empty" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ PM2 error: $_" -ForegroundColor Red
}

Write-Host ""

# Test 6: Check network
Write-Host "Test 6: Checking Network" -ForegroundColor Yellow
try {
    $port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
    if ($port) {
        Write-Host "  ✅ Port 3001 is accessible" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Port 3001 not listening" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Network check error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ DIAGNOSIS COMPLETE" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Always exit successfully
exit 0
