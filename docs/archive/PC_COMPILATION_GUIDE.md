# 🪟 Windows PC Guide: Compile EA & Extract Speed Files

## ✅ **Perfect! Using Your PC is EASIEST & FREE**

Since you have a Windows PC, you can compile directly - no VPS, no VM, no extra costs!

---

## 📋 **Step-by-Step Instructions**

### **PART 1: Compile ImperialSync EA** (5 minutes)

#### **Step 1.1: Download MetaEditor**
1. Go to: https://www.mql5.com/en/download
2. Download **MetaEditor** (free, ~50MB)
3. Install it (default settings are fine)

#### **Step 1.2: Get EA Source Code**
The EA source is already in your project folder on Mac:
- **File:** `ImperialSync.mq5`
- **Location:** Your project folder

**Transfer to PC:**
- **Option A:** Email it to yourself
- **Option B:** Use Google Drive/Dropbox
- **Option C:** Copy via USB drive
- **Option D:** Use SCP from Mac:
  ```bash
  # On Mac, from project folder:
  scp ImperialSync.mq5 your-username@your-pc-ip:/Users/your-username/Desktop/
  ```

#### **Step 1.3: Compile the EA**
1. Open **MetaEditor** on your PC
2. Click **File → Open**
3. Select `ImperialSync.mq5`
4. Press **F7** (or click Compile button)
5. Look for: `✓ 0 error(s), 0 warning(s)`
6. The compiled file `ImperialSync.ex5` is now at:
   ```
   C:\Users\[YourUsername]\AppData\Roaming\MetaQuotes\Terminal\Common\MQL5\Experts\ImperialSync.ex5
   ```
7. **Copy to Desktop** for easy access

---

### **PART 2: Extract Broker-Specific Speed Files** (10 minutes)

#### **Step 2.1: Install EC Markets MT5**
1. Go to: https://ecmarkets.com/mt5-download
2. Download **EC Markets MT5** installer
3. Install it (use default location)
4. **Open MT5 once** and let it connect (this creates the servers.dat file)

#### **Step 2.2: Copy EC Markets servers.dat**
1. Open **File Explorer**
2. Navigate to:
   ```
   C:\Program Files\EC Markets MT5\config\servers.dat
   ```
   OR if 32-bit:
   ```
   C:\Program Files (x86)\EC Markets MT5\config\servers.dat
   ```
3. **Copy** `servers.dat`
4. **Paste to Desktop**
5. **Rename** to: `ec-servers.dat`

#### **Step 2.3: Install XS.com MT5**
1. Go to: https://xs.com/mt5
2. Download **XS.com MT5** installer
3. Install it (use default location)
4. **Open MT5 once** and let it connect

#### **Step 2.4: Copy XS.com servers.dat**
1. Navigate to:
   ```
   C:\Program Files\XS MT5\config\servers.dat
   ```
   OR if 32-bit:
   ```
   C:\Program Files (x86)\XS MT5\config\servers.dat
   ```
2. **Copy** `servers.dat`
3. **Paste to Desktop**
4. **Rename** to: `xs-servers.dat`

---

### **PART 3: Transfer Files to Mac** (2 minutes)

You now have 3 files on your PC Desktop:
- `ImperialSync.ex5` (compiled EA)
- `ec-servers.dat` (EC Markets speed file)
- `xs-servers.dat` (XS.com speed file)

**Transfer to Mac:**
- **Option A:** Email all 3 files to yourself
- **Option B:** Use Google Drive/Dropbox
- **Option C:** Copy via USB drive
- **Option D:** Use Windows file sharing
- **Option E:** Use SCP from PC to Mac

**Place them on your Mac Desktop:**
```
~/Desktop/
├── ImperialSync.ex5
├── ec-servers.dat
└── xs-servers.dat
```

---

### **PART 4: Upload to Ubuntu VPS** (2 minutes)

Back on your **Mac**:

```bash
# 1. Make sure files are on Mac Desktop
ls ~/Desktop/ImperialSync.ex5
ls ~/Desktop/ec-servers.dat
ls ~/Desktop/xs-servers.dat

# 2. Go to project folder
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"

# 3. Run upload script
./upload-to-vps.sh
```

The script will:
- ✅ Upload compiled EA
- ✅ Upload both speed files
- ✅ Rebuild Docker image
- ✅ Restart Go Brain

---

## ⚡ **Quick Checklist**

### **On Windows PC:**
- [ ] MetaEditor installed
- [ ] EA source code (`ImperialSync.mq5`) on PC
- [ ] EA compiled successfully (`ImperialSync.ex5`)
- [ ] EC Markets MT5 installed
- [ ] `ec-servers.dat` copied to Desktop
- [ ] XS.com MT5 installed
- [ ] `xs-servers.dat` copied to Desktop
- [ ] All 3 files transferred to Mac Desktop

### **On Mac:**
- [ ] 3 files on Desktop
- [ ] Run `./upload-to-vps.sh`
- [ ] Verify upload success
- [ ] Test connection in frontend

---

## 📝 **EA Source Code (ImperialSync.mq5)**

If you need the EA code again, here it is:

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

---

## 🆘 **Troubleshooting**

**Q: Can't find MetaEditor?**
- Download from: https://www.mql5.com/en/download
- It's separate from MT5 terminal

**Q: Compilation errors?**
- Make sure you copied the ENTIRE code
- Check for typos
- Ensure MetaEditor is latest version

**Q: Can't find servers.dat?**
- Make sure you opened MT5 at least once after installing
- Try searching: `C:\Program Files\*MT5*\config\servers.dat`
- Or install MT5 from broker's official website

**Q: Files not transferring to Mac?**
- Use Google Drive (easiest)
- Or email them to yourself
- Or use USB drive

---

## ⏱️ **Time Estimate**

| Task | Time |
|------|------|
| Download MetaEditor | 2 min |
| Compile EA | 3 min |
| Install EC Markets MT5 | 3 min |
| Extract EC speed file | 1 min |
| Install XS.com MT5 | 3 min |
| Extract XS speed file | 1 min |
| Transfer to Mac | 2 min |
| Upload to VPS | 2 min |
| **Total** | **~17 minutes** |

---

## ✅ **You're All Set!**

This is the **easiest and fastest** method since you have a PC!

**Cost:** FREE  
**Time:** ~17 minutes  
**Difficulty:** Easy

**Ready to start?** Follow the steps above! 🚀
