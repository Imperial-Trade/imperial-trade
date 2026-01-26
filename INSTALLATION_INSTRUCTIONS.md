# 📦 Installation Instructions - Windows Python in Wine

## ❌ Automated Installation Failed

The automated silent installer doesn't work properly in Wine. We need **manual installation**.

## ✅ Manual Installation Steps

### Step 1: SSH into VPS

```bash
ssh root@209.222.12.247
# Password: eJ)3-BJ9p9RsF2S$
```

### Step 2: Run the Installation Script

```bash
cd /root
chmod +x INSTALL_PYTHON_MANUAL.sh
./INSTALL_PYTHON_MANUAL.sh
```

### Step 3: Follow the GUI Installer

When the Python installer GUI appears:
1. ✅ **Check "Add Python to PATH"** (IMPORTANT!)
2. Click **"Install Now"**
3. Wait for installation to complete
4. Click **"Close"** when done

### Step 4: The Script Will Continue

The script will automatically:
- Install MetaTrader5 library
- Verify the installation

---

## Alternative: Manual Commands

If the script doesn't work, run these manually:

```bash
cd /tmp
wget https://www.python.org/ftp/python/3.10.11/python-3.10.11-amd64.exe
wine python-3.10.11-amd64.exe
# Follow GUI installer, then:
wine "C:\Python310\python.exe" -m pip install MetaTrader5
wine "C:\Python310\python.exe" -c "import MetaTrader5; print('Success!')"
```

---

**The script has been uploaded to the VPS. Please SSH in and run it!**
