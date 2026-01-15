#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Get MT5 Account Info
Comprehensive account info retrieval using official MT5 Python API
Reference: https://www.mql5.com/en/docs/python_metatrader5/mt5accountinfo_py
"""

import sys
import json
import MetaTrader5 as mt5
import io

# Fix Windows console encoding issues
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def get_account_info(login, password, server):
    """Get comprehensive account info from MT5"""
    initialized_by_us = False
    try:
        generic_mt5_path = r"C:\Program Files\MetaTrader 5\terminal64.exe"
        
        # Convert login to integer
        try:
            login_int = int(login)
        except (ValueError, TypeError):
            return {
                "success": False,
                "error": f"Invalid login ID format: '{login}'. Login ID must be a number."
            }
        
        # Initialize and login in one call (optimized)
        initialized = mt5.initialize(
            path=generic_mt5_path,
            login=login_int,
            password=password,
            server=server,
            timeout=30000
        )
        
        if not initialized:
            error = mt5.last_error()
            return {
                "success": False,
                "error": f"MT5 initialization/login failed: {error}"
            }
        
        initialized_by_us = True
        
        # Wait for IPC pipe
        import time
        time.sleep(1)
        
        # Get MT5 version (per official MT5 Python API)
        # Reference: https://www.mql5.com/en/docs/python_metatrader5/mt5version_py
        mt5_version = mt5.version()
        version_info = None
        if mt5_version:
            version_major, build, release_date = mt5_version
            version_info = {
                "version": version_major,
                "build": build,
                "release_date": release_date
            }
        
        # Get account info (per official MT5 Python API)
        account_info = mt5.account_info()
        
        if not account_info:
            if initialized_by_us:
                mt5.shutdown()
            return {
                "success": False,
                "error": "Failed to get account info"
            }
        
        # Convert to dictionary (per official API example)
        account_dict = account_info._asdict()
        
        # Return comprehensive account info
        result = {
            "success": True,
            "mt5_version": version_info,  # Include MT5 version
            "account_info": {
                # Basic account info
                "login": account_info.login,
                "name": account_info.name,
                "server": account_info.server,
                "company": account_info.company,
                "currency": account_info.currency,
                
                # Trading settings
                "leverage": account_info.leverage,
                "trade_mode": account_info.trade_mode,
                "margin_mode": account_info.margin_mode,
                "trade_allowed": account_info.trade_allowed,
                "trade_expert": account_info.trade_expert,
                "fifo_close": account_info.fifo_close,
                
                # Account balance info
                "balance": account_info.balance,
                "equity": account_info.equity,
                "profit": account_info.profit,
                "credit": account_info.credit,
                "margin": account_info.margin,
                "margin_free": account_info.margin_free,
                "margin_level": account_info.margin_level,
                "margin_so_call": account_info.margin_so_call,
                "margin_so_so": account_info.margin_so_so,
                "margin_initial": account_info.margin_initial,
                "margin_maintenance": account_info.margin_maintenance,
                
                # Additional info
                "limit_orders": account_info.limit_orders,
                "currency_digits": account_info.currency_digits,
                "assets": account_info.assets,
                "liabilities": account_info.liabilities,
                "commission_blocked": account_info.commission_blocked
            },
            "all_properties": account_dict  # Include all properties for reference
        }
        
        if initialized_by_us:
            mt5.shutdown()
        
        return result
        
    except Exception as e:
        if initialized_by_us:
            try:
                mt5.shutdown()
            except:
                pass
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: get_account_info.py <json_credentials>"
        }))
        sys.exit(1)
    
    credentials = json.loads(sys.argv[1])
    result = get_account_info(
        credentials["login"],
        credentials["password"],
        credentials["server"]
    )
    
    print(json.dumps(result, indent=2))

