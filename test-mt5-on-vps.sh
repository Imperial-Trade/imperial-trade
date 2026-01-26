#!/bin/bash
# Test MT5 Connection Directly on Ubuntu VPS
# Run this script ON THE VPS to verify MT5 credentials work

set -e

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  🔍 TESTING MT5 CONNECTION ON UBUNTU VPS"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

# Test credentials
ACCOUNT="81071266"
PASSWORD="Imperial@2026"
SERVER="ECMarkets-MT5-Live01"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 Test Configuration:"
echo "   Account: $ACCOUNT"
echo "   Server: $SERVER"
echo ""

# Check if we're on the VPS (check for common VPS paths)
if [ ! -d "/home" ] && [ ! -d "/root" ]; then
    echo -e "${YELLOW}⚠️  Warning: This doesn't look like a VPS environment${NC}"
    echo "   Please run this script on your Ubuntu VPS"
    exit 1
fi

# Find the vps-broker-service directory
BROKER_SERVICE_DIR=""
POSSIBLE_PATHS=(
    "/root/vps-broker-service"
    "/home/*/vps-broker-service"
    "/opt/vps-broker-service"
    "$(pwd)/vps-broker-service"
    "$(dirname "$0")/vps-broker-service"
)

echo "🔍 Looking for vps-broker-service directory..."
for path in "${POSSIBLE_PATHS[@]}"; do
    if [ -d "$path" ]; then
        BROKER_SERVICE_DIR="$path"
        echo -e "${GREEN}✅ Found: $BROKER_SERVICE_DIR${NC}"
        break
    fi
done

if [ -z "$BROKER_SERVICE_DIR" ]; then
    echo -e "${RED}❌ Could not find vps-broker-service directory${NC}"
    echo "   Please navigate to the directory containing vps-broker-service"
    echo "   Or provide the full path:"
    echo "   export BROKER_SERVICE_DIR=/path/to/vps-broker-service"
    exit 1
fi

# Check if Python test script exists
TEST_SCRIPT="$BROKER_SERVICE_DIR/python/test_connection.py"
if [ ! -f "$TEST_SCRIPT" ]; then
    echo -e "${RED}❌ Test script not found: $TEST_SCRIPT${NC}"
    exit 1
fi

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

# Check if MetaTrader5 library is installed
echo "🔍 Checking Python dependencies..."
if ! python3 -c "import MetaTrader5" 2>/dev/null; then
    echo -e "${RED}❌ MetaTrader5 Python library is not installed${NC}"
    echo "   Install it with: pip3 install MetaTrader5"
    exit 1
fi

echo -e "${GREEN}✅ Python and MetaTrader5 library are available${NC}"
echo ""

# Prepare JSON payload
JSON_PAYLOAD=$(cat <<EOF
{
  "login": "$ACCOUNT",
  "password": "$PASSWORD",
  "server": "$SERVER"
}
EOF
)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Testing MT5 Connection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Running: python3 $TEST_SCRIPT"
echo ""

# Change to the broker service directory
cd "$BROKER_SERVICE_DIR"

# Run the test
echo "📡 Connecting to MT5..."
echo ""

RESULT=$(python3 python/test_connection.py "$JSON_PAYLOAD" 2>&1)
EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "RESULT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Parse JSON result
if echo "$RESULT" | python3 -m json.tool > /dev/null 2>&1; then
    # Valid JSON - check if connected
    CONNECTED=$(echo "$RESULT" | python3 -c "import sys, json; data=json.load(sys.stdin); print('true' if data.get('connected') else 'false')" 2>/dev/null || echo "false")
    
    if [ "$CONNECTED" = "true" ]; then
        echo -e "${GREEN}✅ CONNECTION SUCCESSFUL!${NC}"
        echo ""
        echo "$RESULT" | python3 -m json.tool
        echo ""
        
        # Extract account info
        LOGIN=$(echo "$RESULT" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('account_info', {}).get('login', 'N/A'))" 2>/dev/null || echo "N/A")
        SERVER_USED=$(echo "$RESULT" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('server_used', data.get('account_info', {}).get('server', 'N/A')))" 2>/dev/null || echo "N/A")
        BALANCE=$(echo "$RESULT" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('account_info', {}).get('balance', 'N/A'))" 2>/dev/null || echo "N/A")
        CURRENCY=$(echo "$RESULT" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('account_info', {}).get('currency', 'N/A'))" 2>/dev/null || echo "N/A")
        
        echo "📊 Account Details:"
        echo "   Login: $LOGIN"
        echo "   Server: $SERVER_USED"
        echo "   Balance: $BALANCE $CURRENCY"
        echo ""
        echo -e "${GREEN}✅ Credentials are valid and MT5 connection works!${NC}"
        exit 0
    else
        echo -e "${RED}❌ CONNECTION FAILED${NC}"
        echo ""
        echo "$RESULT" | python3 -m json.tool
        echo ""
        
        # Extract error message
        ERROR=$(echo "$RESULT" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('error', 'Unknown error'))" 2>/dev/null || echo "Unknown error")
        echo -e "${RED}Error: $ERROR${NC}"
        exit 1
    fi
else
    # Not valid JSON - might be an error message
    echo -e "${RED}❌ Unexpected response format${NC}"
    echo ""
    echo "$RESULT"
    exit 1
fi
