# ============================================================================
# ENSURE REDIS IS RUNNING - Auto-start Script
# ============================================================================

$redisServer = "C:\Redis\redis-server.exe"

# Check if Redis is running
$redisProcess = Get-Process redis-server -ErrorAction SilentlyContinue

if ($redisProcess) {
    Write-Host "✅ Redis is already running (PID: $($redisProcess.Id))" -ForegroundColor Green
    exit 0
}

# Start Redis
Write-Host "Starting Redis server..." -ForegroundColor Yellow
Start-Process -FilePath $redisServer -WindowStyle Hidden

Start-Sleep -Seconds 3

# Verify
$redisProcess = Get-Process redis-server -ErrorAction SilentlyContinue
if ($redisProcess) {
    Write-Host "✅ Redis started successfully (PID: $($redisProcess.Id))" -ForegroundColor Green
    
    # Configure for 10,000 concurrency
    if (Test-Path "C:\Redis\redis-cli.exe") {
        & C:\Redis\redis-cli.exe CONFIG SET maxclients 10000 | Out-Null
        & C:\Redis\redis-cli.exe CONFIG SET maxmemory 2147483648 | Out-Null
        & C:\Redis\redis-cli.exe CONFIG SET maxmemory-policy allkeys-lru | Out-Null
        Write-Host "✅ Redis configured for 10,000 concurrent connections" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Failed to start Redis" -ForegroundColor Red
    exit 1
}
