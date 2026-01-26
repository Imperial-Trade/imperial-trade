#!/bin/bash
# MT5 Credentials Test Script for VPS
# Run this script on the VPS to test MT5 connection and trade fetching

echo "=========================================="
echo "MT5 Credentials Test - VPS"
echo "=========================================="
echo ""

# Change to Python scripts directory
cd /root/imperial-factory/vps-broker-service/python || {
    echo "❌ Error: Cannot find Python scripts directory"
    exit 1
}

echo "📍 Current directory: $(pwd)"
echo ""

# Test 1: Test Connection (Demo Account)
echo "🧪 TEST 1: Testing MT5 Connection (Demo Account)"
echo "=========================================="
echo "Login: 800107112"
echo "Server: ECMarkets-MT5-Demo"
echo ""

python3 test_connection.py '{"login": "800107112", "password": "Demo@123", "server": "ECMarkets-MT5-Demo", "portable_mode": false}'

CONNECTION_RESULT=$?
echo ""
echo "Connection test exit code: $CONNECTION_RESULT"
echo ""

# Wait a bit before next test
sleep 2

# Test 2: Fetch Trades (Demo Account)
echo ""
echo "🧪 TEST 2: Testing Trade Fetching (Demo Account)"
echo "=========================================="
echo "Login: 800107112"
echo "Server: ECMarkets-MT5-Demo"
echo ""

python3 fetch_trades.py '{"login": "800107112", "password": "Demo@123", "server": "ECMarkets-MT5-Demo", "portable_mode": false}'

TRADES_RESULT=$?
echo ""
echo "Trade fetch test exit code: $TRADES_RESULT"
echo ""

echo "=========================================="
echo "✅ Tests completed!"
echo "=========================================="
