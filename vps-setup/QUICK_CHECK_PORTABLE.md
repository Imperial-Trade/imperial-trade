# 🔍 Quick Check: Broker Service & Portable Mode

## Run This on VPS

```powershell
powershell.exe -ExecutionPolicy Bypass -File C:\vps-broker-service\vps-setup\CHECK_BROKER_SERVICE_PORTABLE.ps1
```

## What It Checks

1. **PM2 Broker Service** - Is it running?
2. **Port 3001** - Is it listening?
3. **MT5 Processes** - Are they running in portable mode?
4. **MT5 Data Directory** - Is portable data path being used?
5. **Python Scripts** - What path are they configured to use?
6. **Terminal Manager** - What path is it configured to use?

## Expected Results

**If portable mode is working:**
- ✅ MT5 process path: `C:\MT5_BrokerService\terminal64.exe`
- ✅ Command line includes: `/portable`
- ✅ Data directory: `C:\MT5_BrokerService`
- ✅ Python scripts use portable path (if configured)

**If standard mode:**
- ⚠️ MT5 process path: `C:\Program Files\MetaTrader 5\terminal64.exe`
- ⚠️ No `/portable` argument
- ⚠️ Data directory: `%APPDATA%\MetaQuotes\Terminal`

---

**Run the script to see current status!**
