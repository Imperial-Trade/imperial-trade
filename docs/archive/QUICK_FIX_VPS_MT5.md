# Quick Fix for MT5 Connection Failure on VPS

## 🔍 Problem Identified

From your test output:
- ✅ Python script runs
- ✅ MetaTrader5 library installed
- ❌ **MT5 terminal not accessible** (error code 10004)

## 🎯 Most Likely Issue

**MT5 terminal (terminal64.exe) is not running or not found at expected path.**

---

## 🔧 Quick Diagnostic Commands (Run on VPS)

### 1. Check if MT5 Terminal File Exists

```bash
# Search for terminal64.exe
find /root /home -name "terminal64.exe" 2>/dev/null
```

### 2. Check if MT5 Process is Running

```bash
ps aux | grep terminal64 | grep -v grep
```

### 3. Check Wine Setup

```bash
wine --version
echo $WINEPREFIX
ls -la ~/.wine/drive_c/MT5_BrokerService/ 2>/dev/null
```

---

## 🔧 Solutions

### Solution 1: Start MT5 Terminal Manually

If MT5 is installed but not running:

```bash
# Find MT5 directory
MT5_DIR=$(find /root /home -name "terminal64.exe" 2>/dev/null | head -1 | xargs dirname)

# Start MT5 (if found)
if [ -n "$MT5_DIR" ]; then
  cd "$MT5_DIR"
  wine terminal64.exe &
  echo "MT5 terminal started in background"
else
  echo "MT5 terminal not found. Need to install it first."
fi
```

### Solution 2: Install/Setup MT5 on VPS

If MT5 is not installed:

1. **Install Wine** (if not installed):
   ```bash
   sudo apt update
   sudo apt install wine
   ```

2. **Download MT5** and install to Wine

3. **Configure MT5 path** in the Python scripts

---

## 📝 What to Check Next

1. **Is MT5 installed on the VPS?**
   - Run: `find /root /home -name "terminal64.exe" 2>/dev/null`

2. **Is MT5 running?**
   - Run: `ps aux | grep terminal64`

3. **Is Wine configured correctly?**
   - Run: `wine --version` and check Wine prefix

---

## ⚠️ Important

The Python test script expects MT5 terminal to be:
- ✅ Installed (terminal64.exe exists)
- ✅ Running (process is active)
- ✅ Accessible (correct path in Wine)

**Please run the diagnostic commands above and share the results!**

This will help identify if MT5 needs to be installed, started, or configured.
