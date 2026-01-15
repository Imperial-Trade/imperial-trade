#!/usr/bin/env python3
"""
Test MT5 Connection with Server Name Variations
Tries multiple server name variations to find the correct one
"""

import sys
import json
import MetaTrader5 as mt5
import time

def test_connection_with_variations(login, password, server_variations):
    """Test MT5 connection with multiple server name variations"""
    initialized_by_us = False
    try:
        # Use Generic MT5 path
        generic_mt5_path = r"C:\Program Files\MetaTrader 5\terminal64.exe"
        
        # Initialize MT5
        max_retries = 3
        initialized = False
        for attempt in range(max_retries):
            initialized = mt5.initialize(path=generic_mt5_path)
            if initialized:
                break
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
        
        if not initialized:
            return {
                "connected": False,
                "error": f"MT5 initialization failed: {mt5.last_error()}",
                "server_used": None
            }
        
        initialized_by_us = True
        
        # Convert login to integer
        try:
            login_int = int(login)
        except (ValueError, TypeError):
            return {
                "connected": False,
                "error": f"Invalid login ID format: '{login}'",
                "server_used": None
            }
        
        # Try each server variation
        for variation in server_variations:
            server = variation['server']
            priority = variation.get('priority', 99)
            
            print(f"Trying server '{server}' (priority {priority})...")
            
            # Use official timeout parameter (per MT5 Python API documentation)
            # Reference: https://www.mql5.com/en/docs/python_metatrader5/mt5login_py
            # timeout in milliseconds, default is 60000 (60 seconds)
            authorized = mt5.login(login_int, password=password, server=server, timeout=30000)
            
            if authorized:
                account_info = mt5.account_info()
                if account_info:
                    result = {
                        "connected": True,
                        "server_used": server,
                        "account_info": {
                            "login": account_info.login,
                            "name": account_info.name,
                            "server": account_info.server,
                            "balance": account_info.balance,
                            "equity": account_info.equity,
                            "currency": account_info.currency,
                            "leverage": account_info.leverage
                        },
                        "tried_variations": len(server_variations),
                        "successful_variation": server
                    }
                    if initialized_by_us:
                        mt5.shutdown()
                    return result
                else:
                    print(f"  Login succeeded but account_info is None")
            else:
                error = mt5.last_error()
                error_msg = error[1] if isinstance(error, tuple) else str(error)
                print(f"  Failed: {error_msg}")
        
        # All variations failed
        if initialized_by_us:
            mt5.shutdown()
        return {
            "connected": False,
            "error": f"All server variations failed. Tried: {[v['server'] for v in server_variations]}",
            "server_used": None,
            "tried_variations": len(server_variations)
        }
        
    except Exception as e:
        if initialized_by_us:
            try:
                mt5.shutdown()
            except:
                pass
        return {
            "connected": False,
            "error": str(e),
            "server_used": None
        }

if __name__ == "__main__":
    try:
        if len(sys.argv) < 2:
            print(json.dumps({
                "connected": False,
                "error": "Usage: test_connection_with_variations.py <json_credentials_with_variations>"
            }))
            sys.exit(1)
        
        data = json.loads(sys.argv[1])
        login = data.get('login')
        password = data.get('password')
        server_variations = data.get('server_variations', [])
        
        if not login or not password or not server_variations:
            print(json.dumps({
                "connected": False,
                "error": "Missing login, password, or server_variations"
            }))
            sys.exit(1)
        
        result = test_connection_with_variations(login, password, server_variations)
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({
            "connected": False,
            "error": str(e)
        }))
        sys.exit(1)


