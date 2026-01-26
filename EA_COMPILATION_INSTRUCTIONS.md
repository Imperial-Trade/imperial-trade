# ✅ EA Source Code Copied to MT5

## ✅ What I Did

1. ✅ Found MT5 installed at: `/Applications/MetaTrader 5.app`
2. ✅ Found MQL5 directory at: `/Users/nthny_11/Library/Application Support/net.metaquotes.wine.metatrader5/...`
3. ✅ Created Experts directory
4. ✅ Copied `ImperialSync.mq5` to MT5 Experts folder
5. ⏳ Opened MT5 (you need to compile manually)

## 📋 Next Steps (You Need to Do)

### Option 1: Compile in MetaEditor (Recommended)

1. **Open MetaEditor:**
   - Launch MT5 (should be open)
   - Press `F4` or go to Tools → MetaQuotes Language Editor

2. **Open the EA:**
   - In MetaEditor, open: `ImperialSync.mq5`
   - File → Open → Navigate to Experts folder

3. **Compile:**
   - Press `F7` or click the Compile button
   - Check for errors (should compile successfully)
   - Look for: `0 error(s), 0 warning(s)`

4. **Find Compiled File:**
   - Compiled file: `ImperialSync.ex5`
   - Location: Same directory as `.mq5` file

5. **Upload to VPS:**
   ```bash
   cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
   scp "/Users/nthny_11/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5/MQL5/Experts/ImperialSync.ex5" root@209.222.12.247:/root/imperial-factory/mt5-master/MQL5/Experts/
   ```

### Option 2: Check if Already Compiled

The EA might auto-compile when MT5 opens. Check if `.ex5` file exists:

```bash
ls -la "/Users/nthny_11/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5/MQL5/Experts/ImperialSync.*"
```

If `.ex5` file exists, we can upload it directly!

## 📝 File Locations

**Source:** `/Users/nthny_11/.../MQL5/Experts/ImperialSync.mq5`
**Compiled:** `/Users/nthny_11/.../MQL5/Experts/ImperialSync.ex5` (after compilation)
