# Step 1: Build Docker Worker Image

## ✅ Current Status

- ✅ Dockerfile created on VPS at `/root/imperial-factory/mt5-master/Dockerfile`
- ✅ Docker installed and running
- ⏳ MT5 installation files needed

## 📋 What's Needed

To build the Docker image, you need:
1. **MT5 Installation Files** - The terminal64.exe and supporting files
2. **MQL5 EA** - ImperialSync.ex5 (compiled EA)

## 🔧 Option 1: Download MT5 from Official Site (Recommended)

### Steps:

1. **Download MT5 Portable Version:**
   - Go to: https://www.metatrader5.com/en/download
   - Download the portable/installer version
   - Extract it to get `terminal64.exe` and supporting files

2. **Upload to VPS:**
   ```bash
   # From your Mac (where you downloaded MT5)
   cd ~/Downloads  # or wherever MT5 is
   
   # Create a tarball of MT5 files
   tar -czf mt5-files.tar.gz MetaTrader\ 5/
   
   # Upload to VPS
   scp mt5-files.tar.gz root@209.222.12.247:/root/imperial-factory/mt5-master/
   
   # SSH to VPS and extract
   ssh root@209.222.12.247
   cd /root/imperial-factory/mt5-master
   tar -xzf mt5-files.tar.gz
   # Move files to root of mt5-master directory
   mv MetaTrader\ 5/* .
   ```

3. **Build Docker Image:**
   ```bash
   cd /root/imperial-factory/mt5-master
   docker build -t imperial-worker .
   ```

## 🔧 Option 2: Use Existing MT5 Installation (If Available)

If you already have MT5 installed on your Mac:

1. **Find MT5 Installation:**
   - Usually at: `/Applications/MetaTrader 5.app/Contents/Resources/`
   - Or check: `~/Library/Application Support/MetaQuotes/`

2. **Copy Essential Files:**
   ```bash
   # From Mac
   cd "/Applications/MetaTrader 5.app/Contents/Resources"
   tar -czf mt5-files.tar.gz terminal64.exe config/ MQL5/
   scp mt5-files.tar.gz root@209.222.12.247:/root/imperial-factory/mt5-master/
   ```

## 📝 Note

The Dockerfile expects:
- `terminal64.exe` in the root of `/mt5` directory
- `config/` directory for launch.ini files
- `MQL5/Experts/` directory for EA files

## ✅ Verification

After building, verify the image:
```bash
docker images | grep imperial-worker
docker run --rm imperial-worker ls /mt5
```
