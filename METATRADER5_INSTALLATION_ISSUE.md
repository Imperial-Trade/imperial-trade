# MetaTrader5 Installation Issue on Ubuntu

## Problem

The `MetaTrader5` Python package is **Windows-only**. PyPI shows:
- `"platform":"Windows"`
- All wheel files are `-win32.whl` or `-win_amd64.whl`

This means it cannot be installed directly on Ubuntu Linux with `pip3 install MetaTrader5`.

---

## Solution Options

### Option 1: Install Python for Windows via Wine

Since MT5 is running via Wine, we can install Python for Windows in Wine:

```bash
# On VPS
wget https://www.python.org/ftp/python/3.10.11/python-3.10.11-amd64.exe
wine python-3.10.11-amd64.exe /quiet InstallAllUsers=1 PrependPath=1

# Then install MetaTrader5 in Wine Python
wine python -m pip install MetaTrader5
```

### Option 2: Use pymt5linux (Linux-Compatible Alternative)

```bash
# Install pymt5linux (works on Linux)
pip3 install pymt5linux

# Then modify Python scripts to use pymt5linux instead
```

### Option 3: Check if Already Installed

The MetaTrader5 library might already be installed in a Wine Python environment. Check:

```bash
wine python -c "import MetaTrader5; print('Installed')" 2>&1
```

---

## Current Status

✅ **Files uploaded** to VPS  
❌ **MetaTrader5 library** not installed (Windows-only package)  
✅ **Wine is installed** (wine-6.0.3)  
✅ **MT5 is running** via Wine  

---

**Need to install MetaTrader5 in Wine Python environment!**
