//+------------------------------------------------------------------+
//|                                             ImperialSync.mq5     |
//|                        Copyright 2025, Trade Imperial            |
//|                                       https://tradeimperial.com  |
//+------------------------------------------------------------------+
#property copyright "Trade Imperial"
#property link      "https://tradeimperial.com"
#property version   "1.02"
#property strict

// MQL5 Expert Advisor for instant trade synchronization
// This EA runs inside Docker containers and pushes trade data to Supabase
// Uses "One-Shot" timer logic for fast sync on container start

void OnInit() {
   // Wait for connection using timer (more reliable than immediate sync)
   EventSetTimer(2); // Check every 2 seconds
   Print("🚀 Imperial Worker: Waiting for connection...");
   return(INIT_SUCCEEDED);
}

void OnTimer() {
   if(TerminalInfoInteger(TERMINAL_CONNECTED)) {
      Print("✅ Connection Established. Scraping History...");
      SyncTrades();
      
      // Kill timer - only run once (one-shot execution)
      EventKillTimer();
      Print("✅ Sync complete. EA finished.");
   }
}

// Fix: Corrected OnTradeTransaction signature (removed ellipses)
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result) {
   // Only sync when a deal is added to history (trade closed/filled)
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD) {
      SyncTrades();
   }
}

void SyncTrades() {
   // Select last 30 days
   if(!HistorySelect(TimeCurrent()-2592000, TimeCurrent())) {
      Print("⚠️  History selection failed");
      return;
   }
   
   string trades = "";
   int total = HistoryDealsTotal();
   int count = 0;
   
   Print("📊 Found ", total, " deals in history");
   
   for(int i=0; i<total; i++) {
      ulong t = HistoryDealGetTicket(i);
      // Only sync Out/Exit deals (the moment a trade is finalized)
      if(HistoryDealGetInteger(t, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;
      
      long pos_id = HistoryDealGetInteger(t, DEAL_POSITION_ID);
      string dir = "Unknown";

      // Lookup direction without breaking the main loop pointer
      // We check the Deal Type of the entry deal for this position
      if(HistorySelectByPosition(pos_id)) {
         for(int j=0; j<HistoryDealsTotal(); j++) {
            ulong t_in = HistoryDealGetTicket(j);
            if(HistoryDealGetInteger(t_in, DEAL_ENTRY) == DEAL_ENTRY_IN) {
               dir = (HistoryDealGetInteger(t_in, DEAL_TYPE) == DEAL_TYPE_BUY) ? "Long" : "Short";
               break;
            }
         }
         // Re-select original range so the outer loop doesn't get lost
         HistorySelect(TimeCurrent()-2592000, TimeCurrent());
      }

      trades += StringFormat("{\"ticket\":\"%d\",\"symbol\":\"%s\",\"pnl\":%.2f,\"dir\":\"%s\"}",
                             t, HistoryDealGetString(t, DEAL_SYMBOL), HistoryDealGetDouble(t, DEAL_PROFIT), dir);
      
      // Add comma if not the last item
      count++;
      trades += ",";
   }

   // Safety: Only send if trades were found
   if(StringLen(trades) > 0) {
      // Remove trailing comma
      trades = StringSubstr(trades, 0, StringLen(trades)-1);
      
      string payload = "{\"account\":\""+(string)AccountInfoInteger(ACCOUNT_LOGIN)+"\",\"trades\":["+trades+"]}";
      char post[], res[]; 
      string res_headers;
      string head = "Content-Type: application/json\r\n" + "x-ingest-key: Imperial_Secret_2026\r\n";
      
      StringToCharArray(payload, post);
      
      // Note: Ensure URL is in MT5 'Allowed URLs' list
      int res_code = WebRequest("POST", "https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/mt5-sync", head, 5000, post, res, res_headers);
      
      if(res_code == -1) {
         Print("❌ Error in WebRequest: ", GetLastError());
      } else {
         Print("✅ Sync successful. Supabase Response: ", res_code, " trades sent: ", count);
      }
   } else {
      Print("ℹ️  No trades to sync");
   }
}
//+------------------------------------------------------------------+
