#!/usr/bin/env python3
"""
Direct VPS MT5 Connection Test
Tests MT5 connection directly on Ubuntu VPS using provided credentials
"""

import sys
import json
import requests
import os

# Test credentials
LOGIN = "81071266"
PASSWORD = "Imperial@2026"
SERVER = "ECMarkets-MT5-Live01"
BROKER_TYPE = "ecmarkets"
VPS_URL = "http://209.222.12.247:3001"

# Get API key from environment or prompt
VPS_API_KEY = os.getenv('VPS_API_KEY')
if not VPS_API_KEY:
    print("⚠️  VPS_API_KEY not set in environment")
    VPS_API_KEY = input("Enter VPS_API_KEY: ").strip()

def test_vps_health():
    """Test VPS health endpoint"""
    print("\n" + "="*70)
    print("TEST 1: VPS Health Check")
    print("="*70)
    
    try:
        response = requests.get(f"{VPS_URL}/health", timeout=10)
        if response.status_code == 200:
            print("✅ VPS is healthy")
            print(f"   Response: {response.text}")
            return True
        else:
            print(f"❌ VPS health check failed: HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ VPS health check error: {e}")
        return False

def test_mt5_connection():
    """Test MT5 connection via VPS"""
    print("\n" + "="*70)
    print("TEST 2: Direct VPS MT5 Connection Test")
    print("="*70)
    
    payload = {
        "broker_type": BROKER_TYPE,
        "login": LOGIN,
        "password": PASSWORD,
        "server": SERVER
    }
    
    print(f"\nTesting MT5 connection:")
    print(f"  Login: {LOGIN}")
    print(f"  Server: {SERVER}")
    print(f"  Broker Type: {BROKER_TYPE}")
    print()
    
    try:
        response = requests.post(
            f"{VPS_URL}/test-connection",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "X-API-Key": VPS_API_KEY
            },
            timeout=60  # MT5 connection can take up to 60 seconds
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('connected'):
                print("✅ MT5 Connection Successful!")
                print("\nAccount Info:")
                account_info = result.get('account_info', {})
                print(f"  Login: {account_info.get('login')}")
                print(f"  Name: {account_info.get('name')}")
                print(f"  Server: {account_info.get('server')}")
                print(f"  Balance: {account_info.get('balance')} {account_info.get('currency')}")
                print(f"  Equity: {account_info.get('equity')} {account_info.get('currency')}")
                print(f"  Leverage: 1:{account_info.get('leverage')}")
                print(f"  Connection Time: {result.get('connection_time_ms')}ms")
                return True
            else:
                print("❌ MT5 Connection Failed")
                print(f"   Error: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ VPS Connection Test Failed: HTTP {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('error', response.text)}")
            except:
                print(f"   Response: {response.text[:500]}")
            return False
    except requests.exceptions.Timeout:
        print("❌ Connection timeout (60s). MT5 may be slow to initialize.")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("\n" + "="*70)
    print("  End-to-End Test: Journal XX Pro Broker Sync")
    print("="*70)
    
    # Test 1: VPS Health
    health_ok = test_vps_health()
    if not health_ok:
        print("\n❌ VPS health check failed. Cannot proceed.")
        sys.exit(1)
    
    # Test 2: MT5 Connection
    connection_ok = test_mt5_connection()
    
    # Summary
    print("\n" + "="*70)
    print("  Test Summary")
    print("="*70)
    print(f"\n✅ VPS Health: {'PASS' if health_ok else 'FAIL'}")
    print(f"✅ MT5 Connection: {'PASS' if connection_ok else 'FAIL'}")
    
    if connection_ok:
        print("\n✅ All tests passed! MT5 connection is working.")
        print("\nNext Steps:")
        print("1. Test test-broker-connection Edge Function from frontend")
        print("2. Test sync-broker-trades Edge Function after connecting")
        print("3. Verify MQL5 EA is configured to send trades to mt5-sync")
    else:
        print("\n❌ MT5 connection test failed.")
        print("\nTroubleshooting:")
        print("1. Verify credentials are correct")
        print("2. Check VPS logs: pm2 logs imperial-trade-broker-service")
        print("3. Verify MT5_BrokerService terminal is running on VPS")
        sys.exit(1)

if __name__ == "__main__":
    main()
