# Advanced Watchdog Architecture - 24/7 Price Feeder Operation

## 🏗️ Enterprise-Grade Design

### Multi-Layer Protection System

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Windows Task Scheduler                       │
│  - Auto-starts MT5 on VPS boot                         │
│  - Runs monitoring task every 5 minutes                │
│  - Restarts MT5 if closed                               │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Advanced Watchdog (Node.js)                  │
│  - Monitors MT5 process existence                       │
│  - Verifies MT5 broker connection (log file analysis)   │
│  - Checks price updates in database                     │
│  - Multiple MT5 startup methods with fallback           │
│  - Exponential backoff                           │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 3: PM2 Process Manager                          │
│  - Auto-restart Price Feeder on crash                   │
│  - Process persistence across reboots                   │
│  - Health monitoring                                    │
└─────────────────────────────────────────────────────────┘
```

## 🔍 Advanced MT5 Monitoring

### 1. Process Existence Check
- Verifies `terminal64.exe` process is running
- Checks process path matches `MT5_PriceFeeder`
- Fast detection (10 seconds)

### 2. Connection Health Verification
- **Advanced**: Reads MT5 log files to verify broker connection
- Checks for "connected", "authorized", "login success" messages
- Not just process existence - actual connection status

### 3. Price Update Verification
- Queries Supabase database for recent price updates
- Detects if prices stop streaming (Price Feeder stuck)
- 30-second threshold for inactivity detection

## 🚀 Intelligent MT5 Startup

### Method 1: Direct Execution (Primary)
```powershell
terminal64.exe /portable /config:"C:\MT5_PriceFeeder\config\common.ini"
```
- Most reliable method
- Uses MT5's native portable mode
- Explicit config file path

### Method 2: PowerShell Start-Process (Fallback)
```powershell
Start-Process -FilePath "terminal64.exe" -ArgumentList "/portable"
```
- Alternative if direct execution fails
- Better error handling

### Method 3: Windows Task Scheduler (Last Resort)
```powershell
schtasks.exe /Run /TN "MT5_PriceFeeder_AutoStart"
```
- Uses pre-configured Windows task
- Most reliable for system-level startup

## 🛡️ Protection Mechanisms

### 1. Cooldown System
- Prevents rapid restart attempts
- 30-second cooldown between MT5 start attempts
- Prevents system resource exhaustion

### 2. Retry Logic
- Maximum 3 attempts per cycle
- Exponential backoff
- Resets on successful recovery

### 3. Health Verification
- Not just "is process running?"
- Verifies actual broker connection
- Checks price streaming

## 📊 Monitoring Features

### Real-Time Checks (Every 10 seconds)
1. PM2 process status
2. MT5 process existence
3. MT5 connection health (log analysis)
4. Price update verification

### Windows Task Scheduler (Every 5 minutes)
- Independent monitoring layer
- Restarts MT5 if closed
- Works even if watchdog fails

## 🔧 MT5 Configuration Requirements

### Auto-Login Setup
1. Open MT5: `C:\MT5_PriceFeeder\terminal64.exe`
2. Log in with account: **81071266**
3. **Check "Save password" checkbox**
4. Verify auto-login works (close and reopen)

### Portable Mode
- MT5 runs in isolated directory: `C:\MT5_PriceFeeder`
- No conflicts with other MT5 instances
- Independent configuration

## 🎯 Recovery Flow

### Scenario: MT5 Closes

1. **Watchdog Detects** (10 seconds):
   - MT5 process not found
   - Logs: `⚠️ MT5 health check failed: MT5 process not running`

2. **Watchdog Starts MT5**:
   - Tries Method 1 (Direct)
   - Falls back to Method 2 (PowerShell)
   - Falls back to Method 3 (Task Scheduler)
   - Waits 15 seconds for initialization

3. **Watchdog Verifies Connection**:
   - Checks MT5 log files
   - Verifies broker connection
   - Logs: `✅ MT5 process running and connected`

4. **Watchdog Restarts Price Feeder**:
   - After MT5 is confirmed connected
   - Price Feeder reconnects to MT5
   - Prices resume streaming

5. **Windows Task Scheduler** (Backup):
   - Runs every 5 minutes
   - If MT5 closed, restarts it
   - Independent of watchdog

### Total Recovery Time: ~20-30 seconds

## 📋 Setup Instructions

### 1. Install Advanced Watchdog
```powershell
cd C:\imperial-price-feeder\watchdogs
pm2 delete price-feeder-watchdog
pm2 start price-feeder-watchdog-advanced.js --name price-feeder-watchdog
pm2 save
```

### 2. Setup Windows Tasks
```powershell
powershell.exe -ExecutionPolicy Bypass -File C:\vps-broker-service\vps-setup\SETUP_MT5_WINDOWS_SERVICE.ps1
```

### 3. Verify MT5 Auto-Login
- Open MT5 manually
- Log in and save password
- Close and verify auto-login works

## ✅ Success Indicators

- Watchdog logs show: `✅ MT5 process running and connected`
- No "MT5 health check failed" warnings
- Prices updating every 1 second
- MT5 stays open even if manually closed
- MT5 auto-starts on VPS reboot

## 🔬 Advanced Features

### Log File Analysis
- Reads MT5 logs to verify connection
- Detects connection failures before they affect prices
- More reliable than just process checking

### Multiple Startup Methods
- 3 different methods with automatic fallback
- Handles different Windows configurations
- Works even if one method fails

### Cooldown & Retry Logic
- Prevents system overload
- Intelligent retry with backoff
- Resets on successful recovery

## 🎓 Software Engineering Best Practices

1. **Defense in Depth**: Multiple layers of protection
2. **Fail-Safe Design**: Falls back to alternative methods
3. **Health Verification**: Not just existence, but actual functionality
4. **Resource Management**: Cooldowns prevent exhaustion
5. **Observability**: Comprehensive logging for debugging
6. **Resilience**: Handles failures gracefully
