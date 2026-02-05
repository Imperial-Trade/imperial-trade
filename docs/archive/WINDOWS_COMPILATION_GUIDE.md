# 🪟 Windows PC Guide: Compile EA & Extract Speed Files

## ✅ What You Need

- **Your existing Windows PC/laptop** (Windows 10/11)
- **5-10 minutes** of time
- **Internet connection** to upload files

---

## 📋 Step-by-Step Instructions

### **PART 1: Compile ImperialSync EA**

#### Step 1.1: Download MetaEditor
1. Go to: https://www.mql5.com/en/download
2. Download **MetaEditor** (it's free, ~50MB)
3. Install it (default settings are fine)

#### Step 1.2: Get the EA Source Code
1. **Option A - From VPS:**
   ```bash
   # On your Mac, download the EA source
   scp root@209.222.12.247:/root/imperial-factory/mt5-master/MQL5/Experts/ImperialSync.mq5 ~/Desktop/
   ```

2. **Option B - I'll create it for you now** (see below)

#### Step 1.3: Compile the EA
1. Open **MetaEditor** (should be on your desktop)
2. Click **File → New → Expert Advisor**
3. Name it: `ImperialSync`
4. **Replace ALL the code** with the EA source code (provided below)
5. Press **F7** (or click Compile button)
6. Look for: `✓ 0 error(s), 0 warning(s)`
7. The compiled file `ImperialSync.ex5` is now in:
   ```
   C:\Users\[YourUsername]\AppData\Roaming\MetaQuotes\Terminal\Common\MQL5\Experts\
   ```

#### Step 1.4: Upload to VPS
```bash
# From your Mac terminal
scp ~/Desktop/ImperialSync.ex5 root@209.222.12.247:/root/imperial-factory/mt5-master/MQL5/Experts/
```

---

### **PART 2: Extract Broker-Specific Speed Files (servers.dat)**

#### Step 2.1: Install EC Markets MT5
1. Go to: https://ecmarkets.com/mt5-download
2. Download **EC Markets MT5** installer
3. Install it (use default location)
4. Open MT5 once and let it connect (this creates the servers.dat file)

#### Step 2.2: Copy EC Markets servers.dat
1. Open File Explorer
2. Navigate to:
   ```
   C:\Program Files\EC Markets MT5\config\servers.dat
   ```
   OR if 32-bit:
   ```
   C:\Program Files (x86)\EC Markets MT5\config\servers.dat
   ```
3. Copy `servers.dat` to your Desktop
4. Rename it to: `ec-servers.dat`

#### Step 2.3: Install XS.com MT5
1. Go to: https://xs.com/mt5
2. Download **XS.com MT5** installer
3. Install it (use default location)
4. Open MT5 once and let it connect

#### Step 2.4: Copy XS.com servers.dat
1. Navigate to:
   ```
   C:\Program Files\XS MT5\config\servers.dat
   ```
   OR if 32-bit:
   ```
   C:\Program Files (x86)\XS MT5\config\servers.dat
   ```
2. Copy `servers.dat` to your Desktop
3. Rename it to: `xs-servers.dat`

#### Step 2.5: Upload Both Speed Files to VPS
```bash
# From your Mac terminal
scp ~/Desktop/ec-servers.dat root@209.222.12.247:/root/imperial-factory/broker-configs/ec/servers.dat
scp ~/Desktop/xs-servers.dat root@209.222.12.247:/root/imperial-factory/broker-configs/xs/servers.dat
```

---

### **PART 3: Rebuild Docker Image**

After uploading both files, rebuild the Docker image:

```bash
# SSH into VPS
ssh root@209.222.12.247

# Rebuild Docker image with new EA
cd /root/imperial-factory/mt5-master
docker build -t imperial-mt5-worker:latest .

# Verify EA is included
docker run --rm imperial-mt5-worker:latest ls -la /root/.wine/drive_c/users/root/AppData/Roaming/MetaQuotes/Terminal/Common/Files/MQL5/Experts/ImperialSync.ex5

# Restart Go Brain to pick up changes
systemctl restart imperial-brain
```

---

## 📝 EA Source Code (ImperialSync.mq5)

Copy this entire code into MetaEditor:

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

## ⚡ Quick Command Reference

### Download EA source from VPS:
```bash
scp root@209.222.12.247:/root/imperial-factory/mt5-master/MQL5/Experts/ImperialSync.mq5 ~/Desktop/
```

### Upload compiled EA to VPS:
```bash
scp ~/Desktop/ImperialSync.ex5 root@209.222.12.247:/root/imperial-factory/mt5-master/MQL5/Experts/
```

### Upload speed files to VPS:
```bash
# After copying from Windows to Mac Desktop
scp ~/Desktop/ec-servers.dat root@209.222.12.247:/root/imperial-factory/broker-configs/ec/servers.dat
scp ~/Desktop/xs-servers.dat root@209.222.12.247:/root/imperial-factory/broker-configs/xs/servers.dat
```

### Rebuild Docker on VPS:
```bash
ssh root@209.222.12.247 "cd /root/imperial-factory/mt5-master && docker build -t imperial-mt5-worker:latest . && systemctl restart imperial-brain"
```

---

## ✅ Verification Checklist

After completing all steps:

- [ ] `ImperialSync.ex5` exists on VPS
- [ ] `ec/servers.dat` is real broker file (not generic)
- [ ] `xs/servers.dat` is real broker file (not generic)
- [ ] Docker image rebuilt successfully
- [ ] Go Brain restarted
- [ ] Test connection works faster

---

## 🆘 Troubleshooting

**Q: Can't find MetaEditor?**
- Download from: https://www.mql5.com/en/download
- It's a separate download from MT5 terminal

**Q: Compilation errors?**
- Make sure you copied the ENTIRE code above
- Check for typos
- Ensure MetaEditor is latest version

**Q: Can't find servers.dat?**
- Make sure you opened MT5 at least once after installing
- Try searching: `C:\Program Files\*MT5*\config\servers.dat`
- Or install MT5 from broker's official website

**Q: Upload fails?**
- Check SSH key is set up: `ssh root@209.222.12.247` should work
- Verify file paths are correct
- Check file permissions on VPS

---

**Estimated Time:** 10-15 minutes total
**Difficulty:** Easy (just follow steps)
**Result:** ✅ Faster connections + Real trade fetching
