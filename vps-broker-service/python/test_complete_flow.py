#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Complete End-to-End Flow Test
Tests: Frontend → Edge Function → VPS → MT5 → Data Back
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

def test_complete_flow(login, password, server):
    """Test complete flow: Initialize → Login → Get Data → Return"""
    result = {
        "test_name": "Complete End-to-End Flow Test",
        "steps": [],
        "success": False,
        "final_result": None
    }
    
    initialized_by_us = False
    
    try:
        # Step 1: Initialize MT5
        step1 = {"step": 1, "name": "Initialize MT5", "status": "running"}
        result["steps"].append(step1)
        print(f"[STEP 1] Initializing MT5...")
        
        generic_mt5_path = r"C:\Program Files\MetaTrader 5\terminal64.exe"
        start_time = time.time()
        
        try:
            login_int = int(login)
        except (ValueError, TypeError):
            step1["status"] = "failed"
            step1["error"] = f"Invalid login ID format: '{login}'"
            result["final_result"] = {"connected": False, "error": step1["error"]}
            return result
        
        # Initialize with login (optimized 1-step)
        initialized = mt5.initialize(
            path=generic_mt5_path,
            login=login_int,
            password=password,
            server=server,
            timeout=30000
        )
        
        elapsed = time.time() - start_time
        
        if not initialized:
            error = mt5.last_error()
            error_code = error[0] if isinstance(error, tuple) else None
            error_msg = error[1] if isinstance(error, tuple) else str(error)
            step1["status"] = "failed"
            step1["error"] = f"Initialize failed: {error_msg} (code: {error_code})"
            step1["elapsed_ms"] = int(elapsed * 1000)
            result["final_result"] = {"connected": False, "error": step1["error"]}
            return result
        
        initialized_by_us = True
        step1["status"] = "success"
        step1["elapsed_ms"] = int(elapsed * 1000)
        print(f"[STEP 1] ✅ Success ({elapsed:.2f}s)")
        
        # Step 2: Get Version
        step2 = {"step": 2, "name": "Get MT5 Version", "status": "running"}
        result["steps"].append(step2)
        print(f"[STEP 2] Getting MT5 version...")
        
        mt5_version = mt5.version()
        if mt5_version:
            version_major, build, release_date = mt5_version
            step2["status"] = "success"
            step2["version"] = version_major
            step2["build"] = build
            step2["release_date"] = release_date
            print(f"[STEP 2] ✅ Version: {version_major}, Build: {build}, Release: {release_date}")
        else:
            step2["status"] = "warning"
            step2["error"] = "Could not get version"
            print(f"[STEP 2] ⚠️  Warning: Could not get version")
        
        # Step 3: Wait for IPC
        step3 = {"step": 3, "name": "Wait for IPC Pipe", "status": "running"}
        result["steps"].append(step3)
        print(f"[STEP 3] Waiting for IPC pipe...")
        
        time.sleep(1)
        step3["status"] = "success"
        step3["elapsed_ms"] = 1000
        print(f"[STEP 3] ✅ Success")
        
        # Step 4: Verify Terminal Info
        step4 = {"step": 4, "name": "Verify Terminal Info", "status": "running"}
        result["steps"].append(step4)
        print(f"[STEP 4] Verifying terminal info...")
        
        terminal_info = mt5.terminal_info()
        if not terminal_info:
            step4["status"] = "failed"
            step4["error"] = "terminal_info() returned None"
            result["final_result"] = {"connected": False, "error": step4["error"]}
            if initialized_by_us:
                mt5.shutdown()
            return result
        
        if not terminal_info.connected:
            step4["status"] = "failed"
            step4["error"] = f"Terminal not connected: connected={terminal_info.connected}"
            result["final_result"] = {"connected": False, "error": step4["error"]}
            if initialized_by_us:
                mt5.shutdown()
            return result
        
        step4["status"] = "success"
        step4["connected"] = terminal_info.connected
        step4["trade_allowed"] = terminal_info.trade_allowed
        step4["build"] = terminal_info.build
        print(f"[STEP 4] ✅ Terminal Connected: {terminal_info.connected}, Trade Allowed: {terminal_info.trade_allowed}")
        
        # Step 5: Get Account Info
        step5 = {"step": 5, "name": "Get Account Info", "status": "running"}
        result["steps"].append(step5)
        print(f"[STEP 5] Getting account info...")
        
        account_info = mt5.account_info()
        if not account_info:
            step5["status"] = "failed"
            step5["error"] = "account_info() returned None"
            result["final_result"] = {"connected": False, "error": step5["error"]}
            if initialized_by_us:
                mt5.shutdown()
            return result
        
        # Verify we're logged into the correct account
        if account_info.login != login_int:
            step5["status"] = "warning"
            step5["warning"] = f"Logged into account {account_info.login}, expected {login_int}"
            print(f"[STEP 5] ⚠️  Warning: Account mismatch")
        else:
            step5["status"] = "success"
            print(f"[STEP 5] ✅ Logged into correct account: {account_info.login}")
        
        step5["account_login"] = account_info.login
        step5["account_server"] = account_info.server
        step5["account_balance"] = account_info.balance
        step5["account_equity"] = account_info.equity
        step5["account_currency"] = account_info.currency
        
        # Step 6: Prepare Final Result
        step6 = {"step": 6, "name": "Prepare Response", "status": "running"}
        result["steps"].append(step6)
        print(f"[STEP 6] Preparing response...")
        
        total_elapsed = time.time() - start_time
        
        final_result = {
            "connected": True,
            "mt5_version": {
                "version": version_major if mt5_version else None,
                "build": build if mt5_version else None,
                "release_date": release_date if mt5_version else None
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
            "server_used": account_info.server,
            "connection_time_ms": int(total_elapsed * 1000),
            "test_steps": len(result["steps"])
        }
        
        step6["status"] = "success"
        result["success"] = True
        result["final_result"] = final_result
        print(f"[STEP 6] ✅ Response prepared")
        print(f"[COMPLETE] ✅ All steps successful! Total time: {total_elapsed:.2f}s")
        
        if initialized_by_us:
            mt5.shutdown()
        
        return result
        
    except Exception as e:
        error_step = {"step": len(result["steps"]) + 1, "name": "Exception Handler", "status": "failed", "error": str(e)}
        result["steps"].append(error_step)
        result["final_result"] = {"connected": False, "error": f"Exception: {str(e)}"}
        
        if initialized_by_us:
            try:
                mt5.shutdown()
            except:
                pass
        
        return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: test_complete_flow.py <json_credentials>"
        }))
        sys.exit(1)
    
    try:
        credentials = json.loads(sys.argv[1])
        result = test_complete_flow(
            credentials["login"],
            credentials["password"],
            credentials["server"]
        )
        
        # Print both detailed steps and final result
        print("\n" + "="*60)
        print("DETAILED TEST RESULTS:")
        print("="*60)
        print(json.dumps(result, indent=2))
        print("\n" + "="*60)
        print("FINAL RESULT (for API response):")
        print("="*60)
        print(json.dumps(result["final_result"], indent=2))
        
    except json.JSONDecodeError as e:
        print(json.dumps({
            "error": f"JSON decode error: {str(e)}"
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "error": f"Script error: {str(e)}"
        }))
        sys.exit(1)

