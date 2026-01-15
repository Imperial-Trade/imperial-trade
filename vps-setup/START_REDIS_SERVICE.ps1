# ============================================================================
# START REDIS SERVICE - Quick Start Script
# ============================================================================

Write-Host "Starting Redis Server..." -ForegroundColor Cyan

$redisServer = "C:\Redis\redis-server.exe"
$redisConfig = "C:\Redis\redis.conf"

if (-not (Test-Path $redisServer)) {
    Write-Host "ERROR: Redis server not found at: $redisServer" -ForegroundColor Red
    exit 1
}

# Check if Redis is already running
$redisProcess = Get-Process redis-server -ErrorAction SilentlyContinue
if ($redisProcess) {
    Write-Host "Redis is already running (PID: $($redisProcess.Id))" -ForegroundColor Green
    exit 0
}

# Start Redis
Write-Host "Starting Redis server..." -ForegroundColor Yellow
Start-Process -FilePath $redisServer -ArgumentList $redisConfig -WindowStyle Hidden

Start-Sleep -Seconds 3

# Verify
$redisProcess = Get-Process redis-server -ErrorAction SilentlyContinue
if ($redisProcess) {
    Write-Host "✅ Redis started successfully (PID: $($redisProcess.Id))" -ForegroundColor Green
    
    # Test connection
    if (Test-Path "C:\Redis\redis-cli.exe") {
        $pingResult = & C:\Redis\redis-cli.exe ping 2>&1
        if ($pingResult -match "PONG") {
            Write-Host "✅ Redis connection test: PONG" -ForegroundColor Green
        }
    }
} else {
    Write-Host "❌ Failed to start Redis" -ForegroundColor Red
    exit 1
}
