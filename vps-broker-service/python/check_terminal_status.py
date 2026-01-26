#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Check MT5 Terminal Status
Comprehensive terminal info check using official MT5 Python API
Reference: https://www.mql5.com/en/docs/python_metatrader5/mt5terminalinfo_py
"""

import sys
import json
import MetaTrader5 as mt5
import io

# Fix Windows console encoding issues
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def check_terminal_status():
    """Check MT5 terminal status and return comprehensive info"""
    try:
        generic_mt5_path = r"C:\Program Files\MetaTrader 5\terminal64.exe"
        
        # Initialize MT5
        if not mt5.initialize(path=generic_mt5_path):
            error = mt5.last_error()
            return {
                "status": "error",
                "error": f"MT5 initialization failed: {error}",
                "terminal_info": None
            }
        
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
        
        # Get terminal info (per official MT5 Python API)
        terminal_info = mt5.terminal_info()
        
        if not terminal_info:
            mt5.shutdown()
            return {
                "status": "error",
                "error": "terminal_info() returned None",
                "terminal_info": None,
                "mt5_version": version_info
            }
        
        # Convert terminal_info to dictionary (per official API example)
        terminal_dict = terminal_info._asdict()
        
        # Prepare result
        result = {
            "status": "ok",
            "mt5_version": version_info,  # Include MT5 version
            "terminal_info": {
                "name": terminal_info.name,
                "company": terminal_info.company,
                "build": terminal_info.build,
                "path": terminal_info.path,
                "connected": terminal_info.connected,
                "trade_allowed": terminal_info.trade_allowed,
                "dlls_allowed": terminal_info.dlls_allowed,
                "tradeapi_disabled": terminal_info.tradeapi_disabled,
                "maxbars": terminal_info.maxbars,
                "codepage": terminal_info.codepage,
                "ping_last": terminal_info.ping_last,
                "language": terminal_info.language
            },
            "all_properties": terminal_dict
        }
        
        # Check critical settings
        if not terminal_info.connected:
            result["status"] = "warning"
            result["warning"] = "Terminal is not connected"
        
        if not terminal_info.trade_allowed:
            result["status"] = "warning"
            result["warning"] = "Algorithmic Trading is NOT enabled - this will cause issues with trade fetching"
        
        mt5.shutdown()
        return result
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "terminal_info": None
        }

if __name__ == "__main__":
    result = check_terminal_status()
    print(json.dumps(result, indent=2))

