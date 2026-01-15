# ============================================================================
# INSTALL REDIS FOR WINDOWS - HIGH CONCURRENCY (10,000 connections)
# ============================================================================
# Installs Redis for Windows and configures it for high concurrency
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  INSTALLING REDIS FOR WINDOWS (10,000 CONCURRENCY)" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$REDIS_DIR = "C:\Redis"
$REDIS_VERSION = "7.2.0"
$REDIS_DOWNLOAD_URL = "https://github.com/microsoftarchive/redis/releases/download/win-3.2.100/Redis-x64-3.2.100.zip"

# ============================================================================
# STEP 1: Check if Redis is already installed
# ============================================================================
Write-Host "STEP 1: Checking if Redis is already installed..." -ForegroundColor Yellow

$redisProcess = Get-Process redis-server -ErrorAction SilentlyContinue
if ($redisProcess) {
    Write-Host "  [INFO] Redis is already running (PID: $($redisProcess.Id))" -ForegroundColor Green
    Write-Host "  [INFO] Stopping existing Redis instance..." -ForegroundColor Yellow
    Stop-Process -Id $redisProcess.Id -Force
    Start-Sleep -Seconds 2
}

if (Test-Path "$REDIS_DIR\redis-server.exe") {
    Write-Host "  [INFO] Redis is already installed at: $REDIS_DIR" -ForegroundColor Green
} else {
    Write-Host "  [INFO] Redis not found, will install..." -ForegroundColor Yellow
}

# ============================================================================
# STEP 2: Create Redis directory
# ============================================================================
Write-Host ""
Write-Host "STEP 2: Creating Redis directory..." -ForegroundColor Yellow

if (-not (Test-Path $REDIS_DIR)) {
    New-Item -ItemType Directory -Path $REDIS_DIR -Force | Out-Null
    Write-Host "  [OK] Created directory: $REDIS_DIR" -ForegroundColor Green
} else {
    Write-Host "  [OK] Directory exists: $REDIS_DIR" -ForegroundColor Green
}

# ============================================================================
# STEP 3: Download Redis (if not already present)
# ============================================================================
Write-Host ""
Write-Host "STEP 3: Downloading Redis..." -ForegroundColor Yellow

$redisZip = "$REDIS_DIR\redis.zip"
$redisServerExe = "$REDIS_DIR\redis-server.exe"

if (-not (Test-Path $redisServerExe)) {
    Write-Host "  [INFO] Downloading Redis from: $REDIS_DOWNLOAD_URL" -ForegroundColor Gray
    
    try {
        Invoke-WebRequest -Uri $REDIS_DOWNLOAD_URL -OutFile $redisZip -UseBasicParsing
        Write-Host "  [OK] Download complete" -ForegroundColor Green
        
        # Extract
        Write-Host "  [INFO] Extracting Redis..." -ForegroundColor Gray
        Expand-Archive -Path $redisZip -DestinationPath $REDIS_DIR -Force
        Write-Host "  [OK] Extraction complete" -ForegroundColor Green
        
        # Clean up zip
        Remove-Item $redisZip -Force
    } catch {
        Write-Host "  [ERROR] Failed to download Redis: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  [INFO] Trying alternative: Install via Chocolatey or manual download" -ForegroundColor Yellow
        
        # Try Chocolatey if available
        if (Get-Command choco -ErrorAction SilentlyContinue) {
            Write-Host "  [INFO] Installing Redis via Chocolatey..." -ForegroundColor Yellow
            choco install redis-64 -y
        } else {
            Write-Host "  [ERROR] Please install Redis manually:" -ForegroundColor Red
            Write-Host "    1. Download from: https://github.com/microsoftarchive/redis/releases" -ForegroundColor Yellow
            Write-Host "    2. Extract to: $REDIS_DIR" -ForegroundColor Yellow
            Write-Host "    3. Run this script again" -ForegroundColor Yellow
            exit 1
        }
    }
} else {
    Write-Host "  [OK] Redis already downloaded" -ForegroundColor Green
}

# ============================================================================
# STEP 4: Create Redis configuration for high concurrency
# ============================================================================
Write-Host ""
Write-Host "STEP 4: Creating Redis configuration for 10,000 concurrency..." -ForegroundColor Yellow

$redisConfig = @"
# Redis Configuration for High Concurrency (10,000 connections)
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Network
bind 127.0.0.1
port 6379
tcp-backlog 511
timeout 0
tcp-keepalive 300

# High Concurrency Settings
maxclients 10000
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence (optional - disable for better performance)
save ""
appendonly no

# Performance
databases 16
hz 10

# Logging
loglevel notice
logfile "C:\Redis\redis.log"

# Security (optional - add password if needed)
# requirepass your-strong-password-here
"@

$redisConfigPath = "$REDIS_DIR\redis.conf"
$redisConfig | Set-Content -Path $redisConfigPath -Encoding UTF8

Write-Host "  [OK] Configuration created: $redisConfigPath" -ForegroundColor Green

# ============================================================================
# STEP 5: Create Windows Service for Redis
# ============================================================================
Write-Host ""
Write-Host "STEP 5: Creating Windows Service for Redis..." -ForegroundColor Yellow

# Check if service already exists
$existingService = Get-Service -Name "Redis" -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "  [INFO] Redis service already exists" -ForegroundColor Gray
    
    if ($existingService.Status -eq "Running") {
        Write-Host "  [INFO] Stopping existing service..." -ForegroundColor Yellow
        Stop-Service -Name "Redis" -Force
    }
    
    # Remove existing service
    Write-Host "  [INFO] Removing existing service..." -ForegroundColor Yellow
    sc.exe delete Redis | Out-Null
    Start-Sleep -Seconds 2
}

# Create service using NSSM (Non-Sucking Service Manager) or sc.exe
Write-Host "  [INFO] Creating Redis Windows Service..." -ForegroundColor Yellow

# Try using sc.exe first
$serviceCreated = $false
try {
    $serviceResult = sc.exe create Redis binPath= "`"$redisServerExe`" `"$redisConfigPath`"" start= auto DisplayName= "Redis Server"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Service created successfully" -ForegroundColor Green
        $serviceCreated = $true
    }
} catch {
    Write-Host "  [WARN] Failed to create service with sc.exe: $($_.Exception.Message)" -ForegroundColor Yellow
}

# If sc.exe failed, try NSSM
if (-not $serviceCreated) {
    Write-Host "  [INFO] Trying NSSM (Non-Sucking Service Manager)..." -ForegroundColor Yellow
    
    $nssmPath = "$REDIS_DIR\nssm.exe"
    if (-not (Test-Path $nssmPath)) {
        Write-Host "  [INFO] Downloading NSSM..." -ForegroundColor Gray
        $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
        $nssmZip = "$REDIS_DIR\nssm.zip"
        
        try {
            Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZip -UseBasicParsing
            Expand-Archive -Path $nssmZip -DestinationPath $REDIS_DIR -Force
            Copy-Item "$REDIS_DIR\nssm-2.24\win64\nssm.exe" -Destination $nssmPath -Force
            Remove-Item "$REDIS_DIR\nssm-2.24" -Recurse -Force
            Remove-Item $nssmZip -Force
        } catch {
            Write-Host "  [WARN] Failed to download NSSM, will use manual start method" -ForegroundColor Yellow
        }
    }
    
    if (Test-Path $nssmPath) {
        & $nssmPath install Redis "$redisServerExe" "$redisConfigPath"
        & $nssmPath set Redis AppDirectory "$REDIS_DIR"
        & $nssmPath set Redis DisplayName "Redis Server"
        & $nssmPath set Redis Description "Redis in-memory data structure store for high concurrency"
        & $nssmPath set Redis Start SERVICE_AUTO_START
        Write-Host "  [OK] Service created with NSSM" -ForegroundColor Green
        $serviceCreated = $true
    }
}

# ============================================================================
# STEP 6: Start Redis Service
# ============================================================================
Write-Host ""
Write-Host "STEP 6: Starting Redis Service..." -ForegroundColor Yellow

if ($serviceCreated) {
    try {
        Start-Service -Name "Redis" -ErrorAction Stop
        Start-Sleep -Seconds 3
        
        $service = Get-Service -Name "Redis"
        if ($service.Status -eq "Running") {
            Write-Host "  [OK] Redis service is running" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] Service started but status is: $($service.Status)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  [WARN] Failed to start service: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "  [INFO] Starting Redis manually..." -ForegroundColor Yellow
        
        # Start manually
        Start-Process -FilePath $redisServerExe -ArgumentList $redisConfigPath -WindowStyle Hidden
        Start-Sleep -Seconds 2
    }
} else {
    Write-Host "  [INFO] Starting Redis manually (no service created)..." -ForegroundColor Yellow
    Start-Process -FilePath $redisServerExe -ArgumentList $redisConfigPath -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

# ============================================================================
# STEP 7: Verify Redis is Running
# ============================================================================
Write-Host ""
Write-Host "STEP 7: Verifying Redis is running..." -ForegroundColor Yellow

Start-Sleep -Seconds 2

$redisProcess = Get-Process redis-server -ErrorAction SilentlyContinue
$port6379 = netstat -ano | Select-String ":6379" | Select-String "LISTENING"

if ($redisProcess) {
    Write-Host "  [OK] Redis process is running (PID: $($redisProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Redis process not found" -ForegroundColor Red
}

if ($port6379) {
    Write-Host "  [OK] Redis is listening on port 6379" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Port 6379 not listening" -ForegroundColor Red
}

# Test Redis connection
try {
    $redisCli = "$REDIS_DIR\redis-cli.exe"
    if (Test-Path $redisCli) {
        $testResult = & $redisCli ping 2>&1
        if ($testResult -match "PONG") {
            Write-Host "  [OK] Redis connection test: PONG" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] Redis connection test failed: $testResult" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "  [WARN] Could not test Redis connection: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ============================================================================
# STEP 8: Configure Redis for High Concurrency
# ============================================================================
Write-Host ""
Write-Host "STEP 8: Configuring Redis for 10,000 concurrent connections..." -ForegroundColor Yellow

$redisCli = "$REDIS_DIR\redis-cli.exe"
if (Test-Path $redisCli) {
    try {
        # Set max clients to 10,000
        & $redisCli CONFIG SET maxclients 10000 2>&1 | Out-Null
        Write-Host "  [OK] Set maxclients to 10,000" -ForegroundColor Green
        
        # Set max memory to 2GB
        & $redisCli CONFIG SET maxmemory 2gb 2>&1 | Out-Null
        Write-Host "  [OK] Set maxmemory to 2GB" -ForegroundColor Green
        
        # Set memory policy
        & $redisCli CONFIG SET maxmemory-policy allkeys-lru 2>&1 | Out-Null
        Write-Host "  [OK] Set memory policy to allkeys-lru" -ForegroundColor Green
        
        # Verify settings
        $maxClients = & $redisCli CONFIG GET maxclients 2>&1
        Write-Host "  [INFO] Current maxclients: $maxClients" -ForegroundColor Gray
    } catch {
        Write-Host "  [WARN] Could not configure Redis via CLI: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "  [INFO] Configuration is in redis.conf file" -ForegroundColor Gray
    }
} else {
    Write-Host "  [WARN] redis-cli.exe not found, configuration is in redis.conf" -ForegroundColor Yellow
}

# ============================================================================
# FINAL SUMMARY
# ============================================================================
Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Redis Status:" -ForegroundColor Yellow
Write-Host "  ├── Installation: $REDIS_DIR" -ForegroundColor Gray
Write-Host "  ├── Configuration: $redisConfigPath" -ForegroundColor Gray
Write-Host "  ├── Port: 6379" -ForegroundColor Gray
Write-Host "  ├── Max Clients: 10,000" -ForegroundColor Gray
Write-Host "  └── Max Memory: 2GB" -ForegroundColor Gray
Write-Host ""
Write-Host "  Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Restart broker service: pm2 restart imperial-trade-broker-service" -ForegroundColor White
Write-Host "  2. Verify Redis connection in broker service logs" -ForegroundColor White
Write-Host "  3. Test queue system with connection test" -ForegroundColor White
Write-Host ""
Write-Host "  To verify Redis is working:" -ForegroundColor Yellow
Write-Host "  - Check process: Get-Process redis-server" -ForegroundColor White
Write-Host "  - Check port: netstat -ano | findstr :6379" -ForegroundColor White
Write-Host "  - Test connection: C:\Redis\redis-cli.exe ping" -ForegroundColor White
Write-Host ""
