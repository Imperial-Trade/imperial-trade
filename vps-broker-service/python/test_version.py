#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test MT5 version() function
Verifies version() returns tuple as per official API
"""

import sys
import json
import MetaTrader5 as mt5
import io

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

try:
    # Initialize MT5
    generic_mt5_path = r"C:\Program Files\MetaTrader 5\terminal64.exe"
    if not mt5.initialize(path=generic_mt5_path):
        error = mt5.last_error()
        result = {
            "success": False,
            "error": f"Initialize failed: {error}"
        }
        print(json.dumps(result))
        sys.exit(1)
    
    # Get version (per official MT5 Python API)
    # Reference: https://www.mql5.com/en/docs/python_metatrader5/mt5version_py
    mt5_version = mt5.version()
    
    if mt5_version:
        # Unpack tuple: (version, build, release_date)
        version_major, build, release_date = mt5_version
        
        result = {
            "success": True,
            "version": {
                "version": version_major,
                "build": build,
                "release_date": release_date
            },
            "type": "tuple",
            "tuple": list(mt5_version)  # Convert to list for JSON
        }
    else:
        # Check for errors
        error = mt5.last_error()
        result = {
            "success": False,
            "error": f"version() returned None. last_error(): {error}"
        }
    
    mt5.shutdown()
    print(json.dumps(result))
    
except Exception as e:
    result = {
        "success": False,
        "error": str(e)
    }
    print(json.dumps(result))
    sys.exit(1)

