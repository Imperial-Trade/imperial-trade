#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test MT5 Connection with Real Credentials
This script will be updated with actual credentials for testing
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

# REAL CREDENTIALS - EC Markets Demo Account
login = "800107112"
password = "Demo@123"  # EC Markets Demo password
server = "ECMarketsLtd-Demo"

def test_connection():
    """Test MT5 connection with real credentials"""
    try:
        print("="*60)
        print("TESTING MT5 CONNECTION WITH REAL CREDENTIALS")
        print("="*60)
        print(f"Login: {login}")
        print(f"Server: {server}")
        print(f"Password: {'*' * len(password)}")
        print("")
        
        # Step 1: Initialize
        print("[STEP 1] Initializing MT5...")
        generic_mt5_path = r"C:\Program Files\MetaTrader 5\terminal64.exe"
        
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
            error_code = error[0] if isinstance(error, tuple) else None
            error_msg = error[1] if isinstance(error, tuple) else str(error)
            print(f"[ERROR] Initialize failed: {error_msg} (code: {error_code})")
            return {
                "success": False,
                "error": f"Initialize failed: {error_msg}",
                "error_code": error_code
            }
        
        elapsed = time.time() - start_time
        print(f"[OK] MT5 initialized successfully ({elapsed:.2f}s)")
        
        # Step 2: Get version
        print("[STEP 2] Getting MT5 version...")
        version = mt5.version()
        if version:
            print(f"[OK] MT5 Version: {version[0]}, Build: {version[1]}, Release: {version[2]}")
        else:
            print("[WARNING] Could not get version")
        
        # Step 3: Wait for IPC
        print("[STEP 3] Waiting for IPC pipe...")
        time.sleep(1)
        print("[OK] IPC pipe ready")
        
        # Step 4: Verify terminal
        print("[STEP 4] Verifying terminal info...")
        terminal_info = mt5.terminal_info()
        if not terminal_info:
            mt5.shutdown()
            return {"success": False, "error": "Terminal info is None"}
        
        if not terminal_info.connected:
            mt5.shutdown()
            return {"success": False, "error": f"Terminal not connected: {terminal_info.connected}"}
        
        print(f"[OK] Terminal Connected: {terminal_info.connected}")
        print(f"[OK] Trade Allowed: {terminal_info.trade_allowed}")
        
        # Step 5: Get account info
        print("[STEP 5] Getting account info...")
        account_info = mt5.account_info()
        if not account_info:
            mt5.shutdown()
            return {"success": False, "error": "Account info is None"}
        
        # Verify we're on the correct account
        if account_info.login != int(login):
            print(f"[WARNING] Logged into account {account_info.login}, expected {login}")
        
        print(f"[OK] Account Login: {account_info.login}")
        print(f"[OK] Account Name: {account_info.name}")
        print(f"[OK] Account Server: {account_info.server}")
        print(f"[OK] Account Balance: {account_info.balance} {account_info.currency}")
        print(f"[OK] Account Equity: {account_info.equity} {account_info.currency}")
        print(f"[OK] Account Leverage: 1:{account_info.leverage}")
        print(f"[OK] Trade Allowed: {account_info.trade_allowed}")
        
        total_time = time.time() - start_time
        
        result = {
            "success": True,
            "connected": True,
            "mt5_version": {
                "version": version[0] if version else None,
                "build": version[1] if version else None,
                "release_date": version[2] if version else None
            },
            "account_info": {
                "login": account_info.login,
                "name": account_info.name,
                "server": account_info.server,
                "company": account_info.company,
                "currency": account_info.currency,
                "balance": account_info.balance,
                "equity": account_info.equity,
                "profit": account_info.profit,
                "leverage": account_info.leverage,
                "trade_allowed": account_info.trade_allowed,
                "trade_expert": account_info.trade_expert,
                "margin": account_info.margin,
                "margin_free": account_info.margin_free,
                "margin_level": account_info.margin_level
            },
            "connection_time_ms": int(total_time * 1000)
        }
        
        print("")
        print("="*60)
        print("[SUCCESS] CONNECTION TEST PASSED!")
        print("="*60)
        print(json.dumps(result, indent=2))
        
        mt5.shutdown()
        return result
        
    except Exception as e:
        print(f"[ERROR] Exception: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    result = test_connection()
    sys.exit(0 if result.get("success") else 1)

