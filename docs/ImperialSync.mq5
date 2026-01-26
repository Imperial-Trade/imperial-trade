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

int OnInit() {
   // Wait for connection using timer (more reliable than immediate sync)
   EventSetTimer(2); // Check every 2 seconds
   Print("🚀 Imperial Worker: Waiting for connection...");
   return(INIT_SUCCEEDED);
}

void OnTimer() {
   if(TerminalInfoInteger(TERMINAL_CONNECTED)) {
      Print("✅ Connection Established. Scraping History...");
      
      // Send connection heartbeat immediately (updates connection_status to 'connected')
      SendConnectionHeartbeat();
      
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

// Validate that connection is REAL (not just a status flag)
bool ValidateRealConnection() {
   // Layer 1: Status flag (basic check)
   if(!TerminalInfoInteger(TERMINAL_CONNECTED)) {
      Print("❌ Validation failed: Terminal not connected");
      return false;
   }
   
   // Layer 2: Account info (real broker communication)
   long login = AccountInfoInteger(ACCOUNT_LOGIN);
   if(login <= 0) {
      Print("❌ Validation failed: Cannot retrieve account login");
      return false;
   }
   
   string server = AccountInfoString(ACCOUNT_SERVER);
   if(StringLen(server) == 0) {
      Print("❌ Validation failed: Cannot retrieve server name");
      return false;
   }
   
   // Layer 3: History access (data retrieval - critical for trade sync)
   // Automatically access MT5 Journal to verify we can read trade history
   if(!HistorySelect(0, TimeCurrent())) {
      Print("❌ Validation failed: Cannot access MT5 Journal (trade history)");
      return false;
   }
   
   Print("✅ Real connection validated: Login=", login, " Server=", server);
   return true;
}

// Send connection heartbeat to update connection_status immediately (FAST CONNECTION VERIFICATION)
// Only sends heartbeat if connection is REAL (validated)
void SendConnectionHeartbeat() {
   // Validate connection is REAL before sending heartbeat
   if(!ValidateRealConnection()) {
      Print("❌ Cannot send heartbeat: Connection validation failed - not a real connection");
      return;
   }
   
   string account = (string)AccountInfoInteger(ACCOUNT_LOGIN);
   string server = AccountInfoString(ACCOUNT_SERVER);
   string payload = "{\"account\":\""+account+"\",\"server\":\""+server+"\",\"heartbeat\":true}";
   char post[], res[];
   string res_headers;
   string head = "Content-Type: application/json\r\n" + "x-ingest-key: Imperial_Secret_2026\r\n";
   
   StringToCharArray(payload, post);
   
   // Send heartbeat to main endpoint (it will detect heartbeat flag)
   int res_code = WebRequest("POST", "https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/mt5-sync", head, 5000, post, res, res_headers);
   
   if(res_code == 200 || res_code == 201) {
      Print("✅ Connection heartbeat sent (REAL connection verified). Status updated to 'connected' (Response: ", res_code, ")");
   } else {
      Print("⚠️  Heartbeat failed: ", res_code, " Error: ", GetLastError());
   }
}

void SyncTrades() {
   // AUTOMATICALLY ACCESS MT5 JOURNAL - Get ALL trades from account creation
   // Use 0 for start date to get ALL history from account creation
   datetime start_date = 0; // Get ALL history from account creation
   datetime end_date = TimeCurrent();

   if(!HistorySelect(start_date, end_date)) {
      Print("⚠️  History selection failed - Cannot access MT5 Journal");
      return;
   }

   string trades = "";
   int total = HistoryDealsTotal();
   int count = 0;

   Print("📊 AUTOMATICALLY ACCESSED MT5 JOURNAL: Found ", total, " deals in history (ALL history from account creation)");

   // Collect all OUT deals first, then sort by time (latest first)
   // We need to collect deals with their timestamps for sorting
   struct DealInfo {
      ulong ticket;
      datetime time;
      string symbol;
      double pnl;
      string dir;
   };

   DealInfo deals[];
   ArrayResize(deals, 0);

   // First pass: Collect all OUT deals with their info
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
         HistorySelect(start_date, end_date);
      }

      // Store deal info for sorting
      int size = ArraySize(deals);
      ArrayResize(deals, size + 1);
      deals[size].ticket = t;
      deals[size].time = (datetime)HistoryDealGetInteger(t, DEAL_TIME);
      deals[size].symbol = HistoryDealGetString(t, DEAL_SYMBOL);
      deals[size].pnl = HistoryDealGetDouble(t, DEAL_PROFIT);
      deals[size].dir = dir;
   }

   // Sort deals by time (latest first) - bubble sort (simple for MQL5)
   int n = ArraySize(deals);
   for(int i = 0; i < n - 1; i++) {
      for(int j = 0; j < n - i - 1; j++) {
         if(deals[j].time < deals[j+1].time) {
            DealInfo temp = deals[j];
            deals[j] = deals[j+1];
            deals[j+1] = temp;
         }
      }
   }

   // Second pass: Build JSON string from sorted deals (latest to oldest)
   for(int i=0; i<n; i++) {
      trades += StringFormat("{\"ticket\":\"%d\",\"symbol\":\"%s\",\"pnl\":%.2f,\"dir\":\"%s\"}",
                             deals[i].ticket, deals[i].symbol, deals[i].pnl, deals[i].dir);

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
         Print("✅ AUTOMATICALLY SYNCED FROM MT5 JOURNAL. Supabase Response: ", res_code, " trades sent: ", count, " (sorted from latest to oldest)");
      }
   } else {
      Print("ℹ️  No trades to sync from MT5 Journal");
   }
}
//+------------------------------------------------------------------+
