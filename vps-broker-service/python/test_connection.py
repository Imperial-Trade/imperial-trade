#!/usr/bin/env python3
"""
Test MT5 Connection
Tests connection to MT5 broker and returns account info
"""

import sys
import json
import MetaTrader5 as mt5

def test_connection(login, password, server):
    """Test MT5 connection"""
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
            return {
                "connected": False,
                "error": f"Login failed: {mt5.last_error()}"
            }
        
        # Get account info
        account_info = mt5.account_info()
        
        if account_info is None:
            return {
                "connected": False,
                "error": "Failed to get account info"
            }
        
        # Return success
        return {
            "connected": True,
            "account_info": {
                "balance": account_info.balance,
                "equity": account_info.equity,
                "margin": account_info.margin,
                "free_margin": account_info.margin_free,
                "margin_level": account_info.margin_level
            }
        }
    except Exception as e:
        return {
            "connected": False,
            "error": str(e)
        }
    finally:
        mt5.shutdown()

if __name__ == "__main__":
    # Get credentials from command line
    credentials = json.loads(sys.argv[1])
    
    result = test_connection(
        credentials["login"],
        credentials["password"],
        credentials["server"]
    )
    
    print(json.dumps(result))

