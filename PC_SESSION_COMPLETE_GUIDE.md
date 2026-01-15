# 🪟 Complete Guide: Compile EA on Your PC

## 📋 **Everything You Need - Copy This to Your PC**

This file contains EVERYTHING. Just open it on your PC and follow the steps!

---

## 🚀 **STEP 1: Download MetaEditor** (2 minutes)

1. **Go to:** https://www.mql5.com/en/download
2. **Download MetaEditor** (it's free, ~50MB)
3. **Install it** (default settings are fine)
4. **Done!** MetaEditor will be on your desktop or Start menu

---

## 🔨 **STEP 2: Compile the EA** (3 minutes)

### **2.1: Get the EA Code**

Open MetaEditor and create a new file:

1. **Open MetaEditor**
2. **File → New → Expert Advisor**
3. **Name it:** `ImperialSync`
4. **Delete ALL the default code**
5. **Paste this ENTIRE code** (below)

### **2.2: The Complete EA Code**

Copy and paste ALL of this into MetaEditor:

```mql5
//+------------------------------------------------------------------+
//|                                             ImperialSync.mq5     |
//|                        Copyright 2025, Trade Imperial            |
//|                                       https://tradeimperial.com  |
//+------------------------------------------------------------------+
#property copyright "Trade Imperial"
#property link      "https://tradeimperial.com"
#property version   "3.00"
#property strict

// =============================================================================
// ImperialSync v3.0 - File-Relay Pattern
// =============================================================================
// Accurate trade scraping with Entry/Exit deal linking
// Writes to shared folder - Go Brain handles the SSL push
// =============================================================================

int OnInit() {
   EventSetTimer(3);
   Print("🚀 ImperialSync v3.0: File-Relay Pattern Active");
   return(INIT_SUCCEEDED);
}

void OnTimer() {
   if(TerminalInfoInteger(TERMINAL_CONNECTED)) {
      Print("✅ Connected to broker. Starting trade export...");
      SyncTrades();
      EventKillTimer();
   }
}

void OnDeinit(const int reason) {
   EventKillTimer();
}

// =============================================================================
// SyncTrades: Export all closed trades with accurate Entry/Exit linking
// =============================================================================
void SyncTrades() {
   if(!TerminalInfoInteger(TERMINAL_CONNECTED)) return;

   // Select last 90 days of history (covers most active trading)
   datetime start_time = TimeCurrent() - 7776000; // 90 days
   datetime end_time = TimeCurrent();

   if(!HistorySelect(start_time, end_time)) {
      Print("⚠️ Failed to select history");
      return;
   }

   string trades_json = "";
   int count = 0;
   int total_deals = HistoryDealsTotal();

   Print("📊 Processing ", total_deals, " deals from history...");

   for(int i = 0; i < total_deals; i++) {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;

      // Only process "OUT" deals (trade closings) to get finalized PnL
      if(HistoryDealGetInteger(ticket, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;

      string sym = HistoryDealGetString(ticket, DEAL_SYMBOL);
      if(sym == "") continue; // Skip balance operations

      double lots = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      double swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
      double comm = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      double exit_p = HistoryDealGetDouble(ticket, DEAL_PRICE);
      datetime exit_t = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);

      // Critical: Find the original "IN" deal for Entry Price and Direction
      double entry_p = 0;
      datetime entry_t = 0;
      string dir = "Long";

      ulong pos_id = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
      if(pos_id > 0 && HistorySelectByPosition(pos_id)) {
         for(int j = 0; j < HistoryDealsTotal(); j++) {
            ulong t_in = HistoryDealGetTicket(j);
            if(t_in == 0) continue;
            
            if(HistoryDealGetInteger(t_in, DEAL_ENTRY) == DEAL_ENTRY_IN) {
               entry_p = HistoryDealGetDouble(t_in, DEAL_PRICE);
               entry_t = (datetime)HistoryDealGetInteger(t_in, DEAL_TIME);
               dir = (HistoryDealGetInteger(t_in, DEAL_TYPE) == DEAL_TYPE_BUY) ? "Long" : "Short";
               break;
            }
         }
         // Re-select original time range
         HistorySelect(start_time, end_time);
      }

      // Build JSON for this trade
      string trade = StringFormat(
         "{\"ticket\":\"%d\",\"symbol\":\"%s\",\"lots\":%.2f,\"profit\":%.2f,\"swap\":%.2f,\"comm\":%.2f,\"entry_p\":%.5f,\"exit_p\":%.5f,\"entry_t\":\"%s\",\"exit_t\":\"%s\",\"dir\":\"%s\"}",
         ticket, sym, lots, profit, swap, comm, entry_p, exit_p,
         TimeToString(entry_t, TIME_DATE|TIME_SECONDS),
         TimeToString(exit_t, TIME_DATE|TIME_SECONDS),
         dir
      );

      if(count > 0) trades_json += ",";
      trades_json += trade;
      count++;

      // Limit to 500 trades for performance
      if(count >= 500) break;
   }

   // Build full payload with account info
   string payload = StringFormat(
      "{\"account\":\"%d\",\"server\":\"%s\",\"balance\":%.2f,\"trades\":[%s]}",
      AccountInfoInteger(ACCOUNT_LOGIN),
      AccountInfoString(ACCOUNT_SERVER),
      AccountInfoDouble(ACCOUNT_BALANCE),
      trades_json
   );

   Print("📤 Exporting ", count, " trades to file relay...");

   // Write to the shared File-Relay folder (bypasses Wine SSL issues)
   int handle = FileOpen("sync_data.json", FILE_WRITE|FILE_TXT|FILE_COMMON);
   if(handle != INVALID_HANDLE) {
      FileWriteString(handle, payload);
      FileClose(handle);

      // Create a "Flag" file so Go Brain knows writing is finished
      int done = FileOpen("sync_done.txt", FILE_WRITE|FILE_TXT|FILE_COMMON);
      if(done != INVALID_HANDLE) {
         FileWriteString(done, "done");
         FileClose(done);
      }

      Print("✅ File-Relay Complete: ", count, " trades exported");
   } else {
      Print("❌ Failed to write to file: ", GetLastError());
   }
}
```

### **2.3: Compile**

1. **Press F7** (or click the Compile button)
2. **Look for:** `✓ 0 error(s), 0 warning(s)` at the bottom
3. **If you see errors:** Check that you copied ALL the code

### **2.4: Find the Compiled File**

The compiled file `ImperialSync.ex5` will be at:

```
C:\Users\[YourUsername]\AppData\Roaming\MetaQuotes\Terminal\Common\MQL5\Experts\ImperialSync.ex5
```

**To find it easily:**
1. Press `Windows Key + R`
2. Type: `%APPDATA%\MetaQuotes\Terminal\Common\MQL5\Experts`
3. Press Enter
4. Look for `ImperialSync.ex5`
5. **Copy it to your Desktop**

---

## 📁 **STEP 3: Extract Speed Files** (10 minutes)

### **3.1: Install EC Markets MT5**

1. **Go to:** https://ecmarkets.com/mt5-download
2. **Download EC Markets MT5** installer
3. **Install it** (use default location)
4. **Open MT5 once** and let it connect (this creates servers.dat)
5. **Close MT5**

### **3.2: Copy EC Markets servers.dat**

1. **Open File Explorer**
2. **Navigate to:**
   ```
   C:\Program Files\EC Markets MT5\config\servers.dat
   ```
   **OR if you have 32-bit Windows:**
   ```
   C:\Program Files (x86)\EC Markets MT5\config\servers.dat
   ```
3. **Copy** `servers.dat`
4. **Paste to Desktop**
5. **Rename** to: `ec-servers.dat`

### **3.3: Install XS.com MT5**

1. **Go to:** https://xs.com/mt5
2. **Download XS.com MT5** installer
3. **Install it** (use default location)
4. **Open MT5 once** and let it connect
5. **Close MT5**

### **3.4: Copy XS.com servers.dat**

1. **Navigate to:**
   ```
   C:\Program Files\XS MT5\config\servers.dat
   ```
   **OR if 32-bit:**
   ```
   C:\Program Files (x86)\XS MT5\config\servers.dat
   ```
2. **Copy** `servers.dat`
3. **Paste to Desktop**
4. **Rename** to: `xs-servers.dat`

---

## ✅ **STEP 4: You Should Now Have 3 Files on Desktop**

- `ImperialSync.ex5` (compiled EA)
- `ec-servers.dat` (EC Markets speed file)
- `xs-servers.dat` (XS.com speed file)

---

## 📤 **STEP 5: Transfer to Mac & Upload**

### **Option A: Email/Dropbox/Drive** (Easiest)

1. **Select all 3 files** on Desktop
2. **Zip them** (Right-click → Send to → Compressed folder)
3. **Email to yourself** or upload to Google Drive/Dropbox
4. **On Mac:** Download the zip, extract to Desktop
5. **On Mac:** Run the upload script

### **Option B: USB Drive**

1. **Copy 3 files** to USB drive
2. **Plug into Mac**
3. **Copy to Mac Desktop**
4. **Run upload script**

---

## 🚀 **STEP 6: Upload to VPS (On Mac)**

Once files are on your **Mac Desktop**, run:

```bash
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
./upload-to-vps.sh
```

Or manually:

```bash
# Upload EA
scp ~/Desktop/ImperialSync.ex5 root@209.222.12.247:/root/imperial-factory/mt5-master/MQL5/Experts/

# Upload speed files
scp ~/Desktop/ec-servers.dat root@209.222.12.247:/root/imperial-factory/broker-configs/ec/servers.dat
scp ~/Desktop/xs-servers.dat root@209.222.12.247:/root/imperial-factory/broker-configs/xs/servers.dat

# Rebuild Docker
ssh root@209.222.12.247 "cd /root/imperial-factory/mt5-master && docker build -t imperial-mt5-worker:latest . && systemctl restart imperial-brain"
```

---

## 🆘 **Troubleshooting**

**Q: Can't find compiled .ex5 file?**
- Press `Windows Key + R`
- Type: `%APPDATA%\MetaQuotes\Terminal\Common\MQL5\Experts`
- Press Enter
- Look for `ImperialSync.ex5`

**Q: Compilation errors?**
- Make sure you copied ALL the code (from `//+------------------------------------------------------------------+` to the very end)
- Check there are no typos
- Make sure MetaEditor is latest version

**Q: Can't find servers.dat?**
- Make sure you opened MT5 at least once after installing
- Try searching: Press `Windows Key`, type "servers.dat"
- Or manually search: `C:\Program Files\*MT5*\config\`

**Q: Files not transferring?**
- Use Google Drive (easiest method)
- Or email them to yourself
- Or use USB drive

---

## ✅ **Checklist**

- [ ] MetaEditor installed
- [ ] EA compiled successfully (`ImperialSync.ex5`)
- [ ] EC Markets MT5 installed
- [ ] `ec-servers.dat` on Desktop
- [ ] XS.com MT5 installed
- [ ] `xs-servers.dat` on Desktop
- [ ] All 3 files transferred to Mac Desktop
- [ ] Uploaded to VPS via script
- [ ] System tested

---

## 🎯 **That's It!**

**Total Time:** ~17 minutes  
**Cost:** FREE  
**Difficulty:** Easy (just follow steps)

**Questions?** This guide has everything you need! 🚀
