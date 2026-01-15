@'
#!/usr/bin/env python3
"""
Fetch MT5 Trades
Fetches all closed trades from MT5 broker
Uses the same reliable approach as get_history.py
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
        
        # Calculate date range (last 90 days)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)
        
        # Get all deals in date range
        deals = mt5.history_deals_get(start_date, end_date)
        
        if deals is None:
            return {
                "trades": [],
                "account_balance": account_balance
            }
        
        # Group deals by position_id (ticket)
        trades_dict = {}
        for deal in deals:
            ticket = deal.position_id
            
            # Skip deals without position_id (deposits, withdrawals, etc.)
            if ticket == 0:
                continue
            
            # Initialize trade if not seen before
            if ticket not in trades_dict:
                trades_dict[ticket] = {
                    "ticket": ticket,
                    "symbol": deal.symbol,
                    "type": 0 if deal.type == mt5.DEAL_TYPE_BUY else 1,
                    "volume": 0,
                    "price_open": 0,
                    "price_close": 0,
                    "price_current": deal.price,  # Current price from latest deal
                    "sl": 0,
                    "tp": 0,
                    "profit": 0,
                    "swap": 0,
                    "commission": 0,
                    "time": 0,
                    "time_close": 0,
                    "comment": deal.comment or ""
                }
            
            trade = trades_dict[ticket]
            
            # Update trade data based on deal entry type
            if deal.entry == mt5.DEAL_ENTRY_IN:
                trade["price_open"] = deal.price
                trade["time"] = deal.time
                trade["volume"] = deal.volume
            elif deal.entry == mt5.DEAL_ENTRY_OUT:
                trade["price_close"] = deal.price
                trade["time_close"] = deal.time
                trade["price_current"] = deal.price
            
            # Accumulate profit, swap, commission
            trade["profit"] += deal.profit
            trade["swap"] += deal.swap
            trade["commission"] += deal.commission
        
        # Get SL/TP from orders (optional)
        orders = mt5.history_orders_get(start_date, end_date)
        if orders:
            for order in orders:
                ticket = order.position_id
                if ticket in trades_dict and ticket != 0:
                    if order.type == mt5.ORDER_TYPE_BUY_LIMIT or order.type == mt5.ORDER_TYPE_BUY_STOP:
                        trades_dict[ticket]["sl"] = order.sl
                        trades_dict[ticket]["tp"] = order.tp
        
        # Convert to list and process timestamps
        trades_list = []
        for trade in trades_dict.values():
            # Only include closed trades (have both entry and exit)
            if trade["time"] != 0 and trade["time_close"] != 0:
                # Convert datetime to Unix timestamp
                if isinstance(trade["time"], datetime):
                    trade["time"] = int(trade["time"].timestamp())
                if isinstance(trade["time_close"], datetime):
                    trade["time_close"] = int(trade["time_close"].timestamp())
                
                trades_list.append(trade)
        
        return {
            "trades": trades_list,
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
    try:
        # Get credentials from command line
        if len(sys.argv) < 2:
            result = {
                "trades": [],
                "account_balance": 0,
                "error": "Missing credentials argument"
            }
        else:
            credentials = json.loads(sys.argv[1])
            
            result = fetch_trades(
                credentials["login"],
                credentials["password"],
                credentials["server"]
            )
        
        # Always output valid JSON to stdout
        print(json.dumps(result))
        sys.stdout.flush()
    except Exception as e:
        # Output error to stderr for debugging
        error_result = {
            "trades": [],
            "account_balance": 0,
            "error": f"Script error: {str(e)}"
        }
        print(json.dumps(error_result), file=sys.stderr)
        print(json.dumps(error_result))
        sys.exit(1)
'@ | Out-File -FilePath "C:\vps-broker-service\python\fetch_trades.py" -Encoding utf8 -NoNewline





