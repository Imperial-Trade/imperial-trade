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
      if(HistorySelectByPosition(pos_id)) {
         for(int j = 0; j < HistoryDealsTotal(); j++) {
            ulong t_in = HistoryDealGetTicket(j);
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

void OnDeinit(const int reason) {
   EventKillTimer();
   Print("🛑 ImperialSync stopped");
}
