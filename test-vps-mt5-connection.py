#!/usr/bin/env python3
"""
Test MT5 Connection Directly on VPS
Run this on the VPS Ubuntu to verify MT5 connection works
"""

import sys
import json
import os

# Add the vps-broker-service python directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'vps-broker-service', 'python'))

try:
    from test_connection import test_connection
except ImportError:
    print("Error: Could not import test_connection. Make sure you're running from the project root.")
    print("Expected path: vps-broker-service/python/test_connection.py")
    sys.exit(1)

# Test credentials
TEST_CREDENTIALS = {
    "login": "81071266",
    "password": "Imperial@2026",
    "server": "ECMarkets-MT5-Live01"
}

if __name__ == "__main__":
    print("=" * 80)
    print("  🔍 TESTING MT5 CONNECTION ON VPS")
    print("=" * 80)
    print()
    print(f"Account: {TEST_CREDENTIALS['login']}")
    print(f"Server: {TEST_CREDENTIALS['server']}")
    print()
    
    result = test_connection(
        TEST_CREDENTIALS["login"],
        TEST_CREDENTIALS["password"],
        TEST_CREDENTIALS["server"]
    )
    
    print()
    print("=" * 80)
    print("  📊 RESULT")
    print("=" * 80)
    print()
    print(json.dumps(result, indent=2))
    print()
    
    if result.get("connected"):
        print("✅ Connection successful!")
        if result.get("account_info"):
            acc = result["account_info"]
            print(f"   Login: {acc.get('login')}")
            print(f"   Server: {acc.get('server')}")
            print(f"   Balance: {acc.get('balance')} {acc.get('currency')}")
            print(f"   Equity: {acc.get('equity')} {acc.get('currency')}")
    else:
        print("❌ Connection failed!")
        print(f"   Error: {result.get('error', 'Unknown error')}")
        sys.exit(1)
