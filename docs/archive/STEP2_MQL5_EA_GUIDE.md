# Step 2: Compile and Upload MQL5 EA

## ✅ Current Status

- ✅ MQL5 EA source code exists: `docs/ImperialSync.mq5`
- ⏳ EA needs to be compiled on Mac using MetaEditor
- ⏳ Compiled EA needs to be uploaded to VPS

## 📋 Steps

### 1. Compile EA on Mac

1. **Open MetaEditor:**
   - Launch MT5 on your Mac
   - Press `F4` or go to Tools → MetaQuotes Language Editor

2. **Create New EA:**
   - File → New → Expert Advisor (template)
   - Name it: `ImperialSync`

3. **Copy Code:**
   - Open: `docs/ImperialSync.mq5`
   - Copy the entire code
   - Paste into MetaEditor (replace template code)

4. **Compile:**
   - Press `F7` or click the Compile button
   - Check for errors (should compile successfully)
   - Compiled file will be at: `~/Documents/MQL5/Experts/ImperialSync.ex5`

### 2. Upload EA to VPS

```bash
# From your Mac
cd ~/Documents/MQL5/Experts/

# Upload to VPS
scp ImperialSync.ex5 root@209.222.12.247:/root/imperial-factory/mt5-master/MQL5/Experts/

# SSH to VPS and verify
ssh root@209.222.12.247
ls -la /root/imperial-factory/mt5-master/MQL5/Experts/
```

### 3. Update Dockerfile (If Needed)

The Dockerfile should copy the EA file. Verify it's included in the build.

## 📝 Notes

- The EA (`ImperialSync.ex5`) must be in: `/mt5/MQL5/Experts/` inside the Docker container
- The EA will be loaded automatically when MT5 starts in the container
- The EA sends trade data to: `https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/mt5-sync`

## ✅ Verification

After upload:
```bash
ssh root@209.222.12.247
ls -lh /root/imperial-factory/mt5-master/MQL5/Experts/ImperialSync.ex5
```

File should exist and have a reasonable size (typically 10-50KB for compiled EA).
