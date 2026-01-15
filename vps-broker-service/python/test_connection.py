#!/usr/bin/env python3
"""
Test MT5 Connection
Tests login to MT5 broker and returns account info
"""

import sys
import json
import MetaTrader5 as mt5

def test_connection(login, password, server):
    """Test MT5 connection and return account info"""
    try:
        # Initialize MT5
        if not mt5.initialize():
            return {
                "connected": False,
                "error": f"MT5 initialization failed: {mt5.last_error()}"
            }
        
        # Login
        authorized = mt5.login(int(login), password=password, server=server)
        
        if not authorized:
            error = mt5.last_error()
            mt5.shutdown()
            return {
                "connected": False,
                "error": f"Login failed: {error}"
            }
        
        # Get account info
        account_info = mt5.account_info()
        
        if account_info is None:
            mt5.shutdown()
            return {
                "connected": False,
                "error": "Failed to get account info"
            }
        
        result = {
            "connected": True,
            "account_info": {
                "login": account_info.login,
                "name": account_info.name,
                "server": account_info.server,
                "balance": account_info.balance,
                "equity": account_info.equity,
                "currency": account_info.currency,
                "leverage": account_info.leverage
            }
        }
        
        mt5.shutdown()
        return result
        
    except Exception as e:
        try:
            mt5.shutdown()
        except:
            pass
        return {
            "connected": False,
            "error": str(e)
        }

if __name__ == "__main__":
    # Get credentials from command line
    credentials = json.loads(sys.argv[1])
    
    result = test_connection(
        credentials["login"],
        credentials["password"],
        credentials["server"]
    )
    
    print(json.dumps(result))
