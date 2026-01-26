# ============================================================================
# GET EXACT MT5 SERVER NAMES
# ============================================================================
# Queries MT5 for exact server names that match the login credentials
# This helps identify the correct server name format
# ============================================================================

$ErrorActionPreference = "Continue"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  GETTING EXACT MT5 SERVER NAMES" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# Generic MT5 path
$mt5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"

# Check if Generic MT5 is running
$mt5Proc = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { 
    $_.Path -like '*MetaTrader 5*' -and $_.Path -notlike '*EC Markets*' 
} | Select-Object -First 1

if (-not $mt5Proc) {
    Write-Host "⚠️  Generic MT5 is NOT RUNNING" -ForegroundColor Yellow
    Write-Host "💡 Starting Generic MT5..." -ForegroundColor Yellow
    Start-Process $mt5Path
    Write-Host "⏳ Waiting 10 seconds for MT5 to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
} else {
    Write-Host "✅ Generic MT5 is RUNNING (PID: $($mt5Proc.Id))" -ForegroundColor Green
}
Write-Host ""

# Get available servers from MT5
Write-Host "[1/3] Querying MT5 for available servers..." -ForegroundColor Yellow
try {
    $pythonScript = "C:\vps-broker-service\python\get_servers.py"
    
    # Get all servers
    $allServers = python $pythonScript 2>&1 | ConvertFrom-Json
    
    if ($allServers.success) {
        Write-Host "   ✅ Found $($allServers.count) total servers" -ForegroundColor Green
        Write-Host ""
        
        # Filter for our brokers
        Write-Host "[2/3] Filtering servers for our brokers..." -ForegroundColor Yellow
        
        # EC Markets servers
        $ecMarketsServers = $allServers.servers | Where-Object { 
            $_.name -like '*ECMarkets*' -or $_.name -like '*EC Markets*' 
        }
        
        # PU Prime servers
        $puPrimeServers = $allServers.servers | Where-Object { 
            $_.name -like '*PUPrime*' -or $_.name -like '*PU Prime*' 
        }
        
        # XS servers
        $xsServers = $allServers.servers | Where-Object { 
            $_.name -like '*XS*' -or $_.name -like '*XSFintech*' 
        }
        
        Write-Host ""
        Write-Host "   📍 EC Markets Servers:" -ForegroundColor Cyan
        if ($ecMarketsServers) {
            foreach ($server in $ecMarketsServers) {
                Write-Host "      - $($server.name)" -ForegroundColor White
            }
        } else {
            Write-Host "      ⚠️  No EC Markets servers found" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "   📍 PU Prime Servers:" -ForegroundColor Cyan
        if ($puPrimeServers) {
            foreach ($server in $puPrimeServers) {
                Write-Host "      - $($server.name)" -ForegroundColor White
            }
        } else {
            Write-Host "      ⚠️  No PU Prime servers found" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "   📍 XS Servers:" -ForegroundColor Cyan
        if ($xsServers) {
            foreach ($server in $xsServers) {
                Write-Host "      - $($server.name)" -ForegroundColor White
            }
        } else {
            Write-Host "      ⚠️  No XS servers found" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "   ❌ Failed to get servers: $($allServers.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Error querying servers: $_" -ForegroundColor Red
}
Write-Host ""

# Check what server name is actually used in MT5 terminal
Write-Host "[3/3] Checking MT5 terminal for logged-in accounts..." -ForegroundColor Yellow
Write-Host "   💡 Check MT5 terminal window title bar for exact server names" -ForegroundColor Gray
Write-Host "   💡 Format: 'LoginID - ServerName: Account Type'" -ForegroundColor Gray
Write-Host ""

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  RECOMMENDED SERVER NAMES (from image)" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Based on MT5 terminal screenshot:" -ForegroundColor Yellow
Write-Host "  1. EC Markets Demo: ECMarketsLtd-Demo ✅ (updated in database)" -ForegroundColor Green
Write-Host "  2. PU Prime: Check MT5 terminal for exact name" -ForegroundColor Yellow
Write-Host "  3. XS: Check MT5 terminal for exact name" -ForegroundColor Yellow
Write-Host ""


