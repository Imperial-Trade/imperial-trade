#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple MT5 Connection Test
Tests basic connection flow
"""

import sys
import json
import MetaTrader5 as mt5
import time
import io

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Test credentials (hardcoded for testing)
login = "800107112"
password = "test123"
server = "ECMarketsLtd-Demo"

try:
    print("[TEST] Starting MT5 connection test...")
    
    # Initialize
    generic_mt5_path = r"C:\Program Files\MetaTrader 5\terminal64.exe"
    print(f"[TEST] Initializing MT5...")
    
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
        sys.exit(1)
    
    print("[OK] MT5 initialized")
    time.sleep(1)
    
    # Get version
    version = mt5.version()
    if version:
        print(f"[OK] MT5 Version: {version[0]}, Build: {version[1]}, Release: {version[2]}")
    
    # Get terminal info
    terminal_info = mt5.terminal_info()
    if terminal_info:
        print(f"[OK] Terminal Connected: {terminal_info.connected}")
        print(f"[OK] Trade Allowed: {terminal_info.trade_allowed}")
    else:
        print("[ERROR] Terminal info is None")
        mt5.shutdown()
        sys.exit(1)
    
    # Get account info
    account_info = mt5.account_info()
    if account_info:
        print(f"[OK] Account Login: {account_info.login}")
        print(f"[OK] Account Server: {account_info.server}")
        print(f"[OK] Account Balance: {account_info.balance} {account_info.currency}")
        print(f"[OK] Account Equity: {account_info.equity} {account_info.currency}")
        
        result = {
            "success": True,
            "connected": True,
            "account_info": {
                "login": account_info.login,
                "server": account_info.server,
                "balance": account_info.balance,
                "equity": account_info.equity,
                "currency": account_info.currency
            }
        }
        print("\n[SUCCESS] Connection test passed!")
        print(json.dumps(result))
    else:
        print("[ERROR] Account info is None")
        mt5.shutdown()
        sys.exit(1)
    
    mt5.shutdown()
    
except Exception as e:
    print(f"[ERROR] Exception: {e}")
    sys.exit(1)

