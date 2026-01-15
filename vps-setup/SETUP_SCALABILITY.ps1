# Setup Script for Scalability (10,000+ Users)
# This script sets up the infrastructure needed for handling 10,000+ concurrent users

Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 SCALABILITY SETUP - 10,000+ USERS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Running as Administrator." -ForegroundColor Green
Write-Host ""

# Configuration
$baseTerminalPath = "C:\MT5_Terminals"
$maxTerminals = 50  # Default: 50 terminals (support 50 concurrent connections)
$redisPort = 6379

# Check if user wants to customize
Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   Terminal Data Path: $baseTerminalPath" -ForegroundColor White
Write-Host "   Max Terminals: $maxTerminals" -ForegroundColor White
Write-Host "   Redis Port: $redisPort" -ForegroundColor White
Write-Host ""

$customize = Read-Host "Do you want to customize these settings? (y/N)"
if ($customize -eq "y" -or $customize -eq "Y") {
    $baseTerminalPath = Read-Host "Enter terminal data path (default: C:\MT5_Terminals)"
    if ([string]::IsNullOrWhiteSpace($baseTerminalPath)) {
        $baseTerminalPath = "C:\MT5_Terminals"
    }
    
    $maxTerminalsInput = Read-Host "Enter max terminals (default: 50)"
    if ([string]::IsNullOrWhiteSpace($maxTerminalsInput)) {
        $maxTerminals = 50
    } else {
        $maxTerminals = [int]$maxTerminalsInput
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  STEP 1: Create Terminal Directories" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Create base directory
if (-not (Test-Path $baseTerminalPath)) {
    Write-Host "Creating base terminal directory: $baseTerminalPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $baseTerminalPath -Force | Out-Null
    Write-Host "✅ Created: $baseTerminalPath" -ForegroundColor Green
} else {
    Write-Host "✅ Base terminal directory already exists: $baseTerminalPath" -ForegroundColor Green
}

# Create terminal subdirectories
Write-Host "Creating $maxTerminals terminal instance directories..." -ForegroundColor Yellow
$created = 0
$existing = 0

for ($i = 1; $i -le $maxTerminals; $i++) {
    $terminalPath = Join-Path $baseTerminalPath "Terminal_$i"
    if (-not (Test-Path $terminalPath)) {
        New-Item -ItemType Directory -Path $terminalPath -Force | Out-Null
        $created++
    } else {
        $existing++
    }
}

Write-Host "✅ Created $created new terminal directories" -ForegroundColor Green
Write-Host "✅ Found $existing existing terminal directories" -ForegroundColor Green
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  STEP 2: Check Redis Installation" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if Redis is installed
$redisInstalled = $false
$redisRunning = $false

# Check if redis-server.exe exists
$redisPaths = @(
    "C:\Program Files\Redis\redis-server.exe",
    "C:\redis\redis-server.exe",
    "$env:ProgramFiles\Redis\redis-server.exe"
)

$redisServerPath = $null
foreach ($path in $redisPaths) {
    if (Test-Path $path) {
        $redisServerPath = $path
        $redisInstalled = $true
        break
    }
}

# Check if Redis is running
try {
    $redisProcess = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
    if ($redisProcess) {
        $redisRunning = $true
    }
} catch {
    # Redis not running
}

if ($redisInstalled) {
    Write-Host "✅ Redis is installed at: $redisServerPath" -ForegroundColor Green
    
    if ($redisRunning) {
        Write-Host "✅ Redis is running" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Redis is not running" -ForegroundColor Yellow
        Write-Host "   Starting Redis..." -ForegroundColor Yellow
        
        try {
            Start-Process -FilePath $redisServerPath -WindowStyle Hidden
            Start-Sleep -Seconds 2
            
            # Check if started
            $redisProcess = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
            if ($redisProcess) {
                Write-Host "✅ Redis started successfully" -ForegroundColor Green
                $redisRunning = $true
            } else {
                Write-Host "❌ Failed to start Redis" -ForegroundColor Red
            }
        } catch {
            Write-Host "❌ Error starting Redis: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "   Please start Redis manually" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ Redis is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "📥 To install Redis on Windows:" -ForegroundColor Yellow
    Write-Host "   1. Download from: https://github.com/microsoftarchive/redis/releases" -ForegroundColor White
    Write-Host "   2. Or use WSL2 with Redis: wsl --install" -ForegroundColor White
    Write-Host "   3. Or use Docker: docker run -d -p 6379:6379 redis" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  The queue system requires Redis to function" -ForegroundColor Yellow
}

Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  STEP 3: Environment Variables" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$envFile = "C:\vps-broker-service\.env"
if (Test-Path $envFile) {
    Write-Host "✅ Found .env file: $envFile" -ForegroundColor Green
    
    # Check if required variables are set
    $envContent = Get-Content $envFile
    $hasRedisHost = $envContent | Select-String -Pattern "REDIS_HOST"
    $hasRedisPort = $envContent | Select-String -Pattern "REDIS_PORT"
    $hasTerminalPath = $envContent | Select-String -Pattern "MT5_TERMINAL_PATH"
    $hasTerminalDataPath = $envContent | Select-String -Pattern "MT5_TERMINALS_DATA_PATH"
    $hasMaxTerminals = $envContent | Select-String -Pattern "MT5_MAX_TERMINALS"
    
    Write-Host ""
    Write-Host "📋 Current .env configuration:" -ForegroundColor Yellow
    Write-Host "   REDIS_HOST: $(if ($hasRedisHost) { '✅ Set' } else { '❌ Missing' })" -ForegroundColor $(if ($hasRedisHost) { 'Green' } else { 'Red' })
    Write-Host "   REDIS_PORT: $(if ($hasRedisPort) { '✅ Set' } else { '❌ Missing' })" -ForegroundColor $(if ($hasRedisPort) { 'Green' } else { 'Red' })
    Write-Host "   MT5_TERMINAL_PATH: $(if ($hasTerminalPath) { '✅ Set' } else { '❌ Missing' })" -ForegroundColor $(if ($hasTerminalPath) { 'Green' } else { 'Red' })
    Write-Host "   MT5_TERMINALS_DATA_PATH: $(if ($hasTerminalDataPath) { '✅ Set' } else { '❌ Missing' })" -ForegroundColor $(if ($hasTerminalDataPath) { 'Green' } else { 'Red' })
    Write-Host "   MT5_MAX_TERMINALS: $(if ($hasMaxTerminals) { '✅ Set' } else { '❌ Missing' })" -ForegroundColor $(if ($hasMaxTerminals) { 'Green' } else { 'Red' })
    
    Write-Host ""
    $updateEnv = Read-Host "Do you want to update .env file with recommended values? (y/N)"
    if ($updateEnv -eq "y" -or $updateEnv -eq "Y") {
        # Add or update environment variables
        $newLines = @()
        $updated = $false
        
        foreach ($line in $envContent) {
            if ($line -match "^REDIS_HOST=") {
                $newLines += "REDIS_HOST=localhost"
                $updated = $true
            } elseif ($line -match "^REDIS_PORT=") {
                $newLines += "REDIS_PORT=6379"
                $updated = $true
            } elseif ($line -match "^MT5_TERMINAL_PATH=") {
                $newLines += "MT5_TERMINAL_PATH=C:\Program Files\MetaTrader 5\terminal64.exe"
                $updated = $true
            } elseif ($line -match "^MT5_TERMINALS_DATA_PATH=") {
                $newLines += "MT5_TERMINALS_DATA_PATH=$baseTerminalPath"
                $updated = $true
            } elseif ($line -match "^MT5_MAX_TERMINALS=") {
                $newLines += "MT5_MAX_TERMINALS=$maxTerminals"
                $updated = $true
            } else {
                $newLines += $line
            }
        }
        
        # Add missing variables
        if (-not $hasRedisHost) {
            $newLines += "REDIS_HOST=localhost"
            $updated = $true
        }
        if (-not $hasRedisPort) {
            $newLines += "REDIS_PORT=6379"
            $updated = $true
        }
        if (-not $hasTerminalPath) {
            $newLines += "MT5_TERMINAL_PATH=C:\Program Files\MetaTrader 5\terminal64.exe"
            $updated = $true
        }
        if (-not $hasTerminalDataPath) {
            $newLines += "MT5_TERMINALS_DATA_PATH=$baseTerminalPath"
            $updated = $true
        }
        if (-not $hasMaxTerminals) {
            $newLines += "MT5_MAX_TERMINALS=$maxTerminals"
            $updated = $true
        }
        
        if ($updated) {
            $newLines | Set-Content $envFile
            Write-Host "✅ Updated .env file" -ForegroundColor Green
        } else {
            Write-Host "✅ .env file already has all required variables" -ForegroundColor Green
        }
    }
} else {
    Write-Host "❌ .env file not found: $envFile" -ForegroundColor Red
    Write-Host "   Creating .env file with recommended values..." -ForegroundColor Yellow
    
    $envContent = @"
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Terminal Manager Configuration
MT5_TERMINAL_PATH=C:\Program Files\MetaTrader 5\terminal64.exe
MT5_TERMINALS_DATA_PATH=$baseTerminalPath
MT5_MAX_TERMINALS=$maxTerminals
"@
    
    $envContent | Set-Content $envFile
    Write-Host "✅ Created .env file" -ForegroundColor Green
}

Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ SETUP COMPLETE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Yellow
Write-Host "   ✅ Terminal directories created: $maxTerminals" -ForegroundColor Green
Write-Host "   ✅ Redis status: $(if ($redisRunning) { 'Running' } else { 'Not Running - Please start manually' })" -ForegroundColor $(if ($redisRunning) { 'Green' } else { 'Yellow' })
Write-Host "   ✅ Environment variables configured" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Install Redis if not already installed" -ForegroundColor White
Write-Host "   2. Install Node.js dependencies: cd C:\vps-broker-service && npm install" -ForegroundColor White
Write-Host "   3. Build the service: npm run build" -ForegroundColor White
Write-Host "   4. Restart the service: pm2 restart imperial-trade-broker-service" -ForegroundColor White
Write-Host "   5. Monitor terminal stats: GET /terminals/stats" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation: vps-setup/SCALABILITY_10K_USERS_IMPLEMENTATION.md" -ForegroundColor Cyan
Write-Host ""
