#!/usr/bin/env python3
"""
Fetch MT5 Trades
Fetches all closed trades from MT5 broker
"""

import sys
import json
import MetaTrader5 as mt5
from datetime import datetime, timedelta

def fetch_trades(login, password, server):
    """Fetch all closed trades from MT5"""
    try:
        # Initialize MT5
        if not mt5.initialize():
            return {
                "trades": [],
                "account_balance": 0,
                "error": f"MT5 initialization failed: {mt5.last_error()}"
            }
        
        # Login
        authorized = mt5.login(int(login), password=password, server=server)
        
        if not authorized:
            return {
                "trades": [],
                "account_balance": 0,
                "error": f"Login failed: {mt5.last_error()}"
            }
        
        # Get account info
        account_info = mt5.account_info()
        account_balance = account_info.balance if account_info else 0
        
        # Fetch closed deals (trades)
        # Get deals from last 90 days
        from_date = datetime.now() - timedelta(days=90)
        to_date = datetime.now()
        
        deals = mt5.history_deals_get(from_date, to_date)
        
        if deals is None:
            return {
                "trades": [],
                "account_balance": account_balance
            }
        
        # Transform deals to trades format
        trades = []
        processed_tickets = set()
        
        for deal in deals:
            # Only process position-closing deals (entry deals are handled separately)
            if deal.entry == mt5.DEAL_ENTRY_OUT:
                ticket = deal.position_id
                
                # Skip if already processed
                if ticket in processed_tickets:
                    continue
                
                processed_tickets.add(ticket)
                
                # Get entry deal for this position
                entry_deals = mt5.history_deals_get(position=ticket)
                entry_deal = None
                if entry_deals:
                    for d in entry_deals:
                        if d.entry == mt5.DEAL_ENTRY_IN:
                            entry_deal = d
                            break
                
                if not entry_deal:
                    continue
                
                # Calculate trade details
                trade = {
                    "ticket": ticket,
                    "symbol": deal.symbol,
                    "type": 0 if entry_deal.type == mt5.DEAL_TYPE_BUY else 1,
                    "volume": deal.volume,
                    "price_open": entry_deal.price,
                    "price_current": deal.price,
                    "price_close": deal.price,
                    "sl": 0,  # MT5 doesn't store SL/TP in deals, would need to check orders
                    "tp": 0,
                    "profit": deal.profit,
                    "swap": deal.swap,
                    "commission": deal.commission,
                    "time": int(entry_deal.time),
                    "time_close": int(deal.time),
                    "comment": deal.comment
                }
                
                trades.append(trade)
        
        return {
            "trades": trades,
            "account_balance": account_balance
        }
    except Exception as e:
        return {
            "trades": [],
            "account_balance": 0,
            "error": str(e)
        }
    finally:
        mt5.shutdown()

if __name__ == "__main__":
    # Get credentials from command line
    credentials = json.loads(sys.argv[1])
    
    result = fetch_trades(
        credentials["login"],
        credentials["password"],
        credentials["server"]
    )
    
    print(json.dumps(result))


