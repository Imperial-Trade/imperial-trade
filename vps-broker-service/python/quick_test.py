#!/usr/bin/env python3
"""
Quick MT5 Connection Test for Wine/Ubuntu
Tests the connection with minimal error handling to see raw results
"""
import MetaTrader5 as mt5
import time
import sys
import os

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

# Use Windows path format for Wine
# Wine maps /root/.wine/drive_c/ to C:\
path = "C:\\imperial-factory\\mt5-master\\terminal64.exe"

print("=" * 60)
print("Quick MT5 Connection Test (Wine/Ubuntu)")
print("=" * 60)
print(f"Using path: {path}")
print(f"Path exists (Linux check): {os.path.exists('/root/.wine/drive_c/imperial-factory/mt5-master/terminal64.exe')}")
print()

# Step 1: Initialize without credentials first (more stable on Wine)
# CRITICAL: Use portable=True - MT5 should be launched with /portable flag
print("Step 1: Initializing MT5 Terminal (portable mode)...")
if not mt5.initialize(path=path, timeout=60000, portable=True):  # 60 second timeout, portable mode
    error = mt5.last_error()
    print(f"Init Failed. Error: {error}")
    print(f"   Error Code: {error[0]}")
    print(f"   Error Description: {error[1]}")
    sys.exit(1)

print("✅ Init Success!")
print()

# Step 2: Wait for IPC pipe to settle (CRITICAL for Wine stability)
print("Step 2: Waiting for IPC pipe to settle (5 seconds)...")
time.sleep(5)
print("✅ Wait complete")
print()

# Step 3: Login (use test credentials from command line or defaults)
if len(sys.argv) > 1:
    import json
    try:
        creds = json.loads(sys.argv[1])
        login = int(creds.get('login', 81071266))
        password = creds.get('password', 'Imperial@2026')
        server = creds.get('server', 'ECMarkets-MT5-Live01')
    except:
        login = 81071266
        password = 'Imperial@2026'
        server = 'ECMarkets-MT5-Live01'
else:
    login = 81071266
    password = 'Imperial@2026'
    server = 'ECMarkets-MT5-Live01'

print(f"Step 3: Attempting login...")
print(f"   Account: {login}")
print(f"   Server: {server}")
print()

if not mt5.login(login=login, password=password, server=server):
    error = mt5.last_error()
    print(f"❌ Login Failed. Error: {error}")
    print(f"   Error Code: {error[0]}")
    print(f"   Error Description: {error[1]}")
    mt5.shutdown()
    sys.exit(1)

print("✅ Login Success!")
print()

# Step 4: Get account info
print("Step 4: Fetching account info...")
account_info = mt5.account_info()
if account_info is None:
    print("❌ Failed to get account info")
    mt5.shutdown()
    sys.exit(1)

print("✅ Account Info Retrieved:")
print(f"   Login: {account_info.login}")
print(f"   Name: {account_info.name}")
print(f"   Server: {account_info.server}")
print(f"   Balance: {account_info.balance}")
print(f"   Equity: {account_info.equity}")
print()

# Step 5: Cleanup
print("Step 5: Shutting down MT5...")
mt5.shutdown()
print("✅ Shutdown complete")
print()

print("=" * 60)
print("✅ FULL CONNECTION SUCCESS!")
print("=" * 60)
