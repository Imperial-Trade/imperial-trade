#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test Fetch Trades with Real Credentials
Tests fetching trade history from MT5
"""

import sys
import json
import MetaTrader5 as mt5
import time
import io
from datetime import datetime, timedelta

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# REAL CREDENTIALS
login = "800107112"
password = "Demo@123"
server = "ECMarketsLtd-Demo"

def test_fetch_trades():
    """Test fetching trades from MT5"""
    try:
        print("="*60)
        print("TESTING FETCH TRADES FROM MT5")
        print("="*60)
        print(f"Login: {login}")
        print(f"Server: {server}")
        print("")
        
        # Initialize
        generic_mt5_path = r"C:\Program Files\MetaTrader 5\terminal64.exe"
        print("[STEP 1] Initializing MT5...")
        
        start_time = time.time()
        initialized = mt5.initialize(
            path=generic_mt5_path,
            login=int(login),
            password=password,
            server=server,
            timeout=30000
        )
        
        if not initialized:
            error = mt5.last_error()
            print(f"[ERROR] Initialize failed: {error}")
            return {"success": False, "error": f"Initialize failed: {error}"}
        
        elapsed = time.time() - start_time
        print(f"[OK] MT5 initialized ({elapsed:.2f}s)")
        time.sleep(1)
        
        # Get account info
        print("[STEP 2] Getting account info...")
        account_info = mt5.account_info()
        if account_info:
            print(f"[OK] Account: {account_info.login}, Balance: {account_info.balance} {account_info.currency}")
        else:
            print("[ERROR] Account info is None")
            mt5.shutdown()
            return {"success": False, "error": "Account info is None"}
        
        # Fetch deals (trades)
        print("[STEP 3] Fetching trade history...")
        from_date = datetime.now() - timedelta(days=90)
        to_date = datetime.now()
        print(f"  Date range: {from_date} to {to_date}")
        
        deals = mt5.history_deals_get(from_date, to_date)
        
        if deals is None:
            error = mt5.last_error()
            print(f"[ERROR] Failed to fetch deals: {error}")
            mt5.shutdown()
            return {"success": False, "error": f"Failed to fetch deals: {error}"}
        
        print(f"[OK] Found {len(deals)} total deals")
        
        # Process deals into trades
        trades = []
        processed_tickets = set()
        
        for deal in deals:
            if deal.entry == mt5.DEAL_ENTRY_OUT:
                ticket = deal.position_id
                if ticket in processed_tickets:
                    continue
                processed_tickets.add(ticket)
                
                # Get entry deal
                entry_deals = mt5.history_deals_get(position=ticket)
                entry_deal = None
                if entry_deals:
                    for d in entry_deals:
                        if d.entry == mt5.DEAL_ENTRY_IN:
                            entry_deal = d
                            break
                
                if not entry_deal:
                    continue
                
                trade = {
                    "ticket": ticket,
                    "symbol": deal.symbol,
                    "type": 0 if entry_deal.type == mt5.DEAL_TYPE_BUY else 1,
                    "volume": deal.volume,
                    "price_open": entry_deal.price,
                    "price_close": deal.price,
                    "profit": deal.profit,
                    "swap": deal.swap,
                    "commission": deal.commission,
                    "time": int(entry_deal.time),
                    "time_close": int(deal.time),
                    "comment": deal.comment or ""
                }
                trades.append(trade)
        
        print(f"[OK] Processed {len(trades)} closed trades")
        
        # Display sample trades
        if trades:
            print("\n[STEP 4] Sample trades:")
            for i, trade in enumerate(trades[:5]):  # Show first 5
                print(f"  Trade {i+1}:")
                print(f"    Symbol: {trade['symbol']}")
                print(f"    Type: {'BUY' if trade['type'] == 0 else 'SELL'}")
                print(f"    Volume: {trade['volume']}")
                print(f"    Open: {trade['price_open']}")
                print(f"    Close: {trade['price_close']}")
                print(f"    Profit: {trade['profit']}")
                print(f"    Time: {datetime.fromtimestamp(trade['time'])}")
        else:
            print("[INFO] No closed trades found in history")
        
        result = {
            "success": True,
            "trades_count": len(trades),
            "trades": trades,
            "account_info": {
                "login": account_info.login,
                "balance": account_info.balance,
                "equity": account_info.equity,
                "currency": account_info.currency
            }
        }
        
        print("\n" + "="*60)
        print("[SUCCESS] FETCH TRADES TEST PASSED!")
        print("="*60)
        print(json.dumps(result, indent=2, default=str))
        
        mt5.shutdown()
        return result
        
    except Exception as e:
        print(f"[ERROR] Exception: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    result = test_fetch_trades()
    sys.exit(0 if result.get("success") else 1)

