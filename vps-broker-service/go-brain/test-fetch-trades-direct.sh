#!/bin/bash
# Test fetching trade logs directly from MT5 using Python scripts on VPS

set -e

echo "📊 Testing Direct Trade Log Fetching from MT5"
echo "=============================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PYTHON_DIR="/root/imperial-factory/broker-service/python"
MT5_DIR="/root/imperial-factory/mt5-master"

# Check if Python scripts exist
if [ ! -d "$PYTHON_DIR" ]; then
    echo -e "${RED}❌ Python scripts directory not found: $PYTHON_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Python scripts directory found${NC}"
echo ""

# Get list of launch files (these contain account credentials)
LAUNCH_FILES=$(ls /root/imperial-factory/config/launch_*.ini 2>/dev/null | head -5 || echo "")

if [ -z "$LAUNCH_FILES" ]; then
    echo -e "${YELLOW}⚠️  No launch.ini files found in /root/imperial-factory/config/${NC}"
    echo "This means no sync tasks are active or no containers have been created yet."
    exit 0
fi

echo -e "${GREEN}Found launch files:${NC}"
for file in $LAUNCH_FILES; do
    echo "  - $(basename $file)"
done
echo ""

# Test each account
for launch_file in $LAUNCH_FILES; do
    echo ""
    echo "=========================================="
    echo -e "${YELLOW}Testing Account: $(basename $launch_file)${NC}"
    echo "=========================================="
    
    # Extract credentials
    LOGIN=$(grep '^Login=' "$launch_file" | cut -d'=' -f2 | head -1 || echo "")
    PASSWORD=$(grep '^Password=' "$launch_file" | cut -d'=' -f2 | head -1 || echo "")
    SERVER=$(grep '^Server=' "$launch_file" | cut -d'=' -f2 | head -1 || echo "")
    
    if [ -z "$LOGIN" ] || [ -z "$SERVER" ]; then
        echo -e "${RED}❌ Could not read credentials${NC}"
        continue
    fi
    
    # Check if credentials are encrypted
    if echo "$LOGIN" | grep -q ":"; then
        echo -e "${RED}❌ Credentials are encrypted (cannot test without decryption)${NC}"
        echo "Login: ${LOGIN:0:30}... (encrypted)"
        echo "Server: ${SERVER:0:30}... (encrypted)"
        continue
    fi
    
    echo "Login: $LOGIN"
    echo "Server: $SERVER"
    echo "Password: ${PASSWORD:0:5}*** (hidden)"
    echo ""
    
    # Try to fetch account info
    echo -e "${YELLOW}Attempting to fetch account info...${NC}"
    
    cd "$PYTHON_DIR"
    
    # Create a test script that uses the credentials
    cat > /tmp/test_account_${LOGIN}.py <<EOF
import sys
import os
sys.path.insert(0, '$PYTHON_DIR')
import MetaTrader5 as mt5
import json
import time

login = $LOGIN
password = '$PASSWORD'
server = '$SERVER'

# Try to initialize MT5
mt5_path = '$MT5_DIR/terminal64.exe'
if os.path.exists(mt5_path):
    initialized = mt5.initialize(path=mt5_path)
else:
    initialized = mt5.initialize()

if not initialized:
    error = mt5.last_error()
    print(json.dumps({"error": f"MT5 init failed: {error}"}))
    sys.exit(1)

# Login
authorized = mt5.login(login, password=password, server=server)
if not authorized:
    error = mt5.last_error()
    print(json.dumps({"error": f"MT5 login failed: {error}"}))
    mt5.shutdown()
    sys.exit(1)

time.sleep(2)  # Wait for connection

# Get account info
account_info = mt5.account_info()
if account_info:
    result = {
        "success": True,
        "login": account_info.login,
        "balance": account_info.balance,
        "equity": account_info.equity,
        "margin": account_info.margin,
        "free_margin": account_info.free_margin,
        "server": account_info.server,
        "currency": account_info.currency,
        "company": account_info.company
    }
else:
    result = {"error": "Failed to get account info"}

# Get history (trades)
from datetime import datetime, timedelta
date_from = datetime.now() - timedelta(days=30)
date_to = datetime.now()

deals = mt5.history_deals_get(date_from, date_to, group="*")
if deals:
    result["total_deals"] = len(deals)
    result["deals"] = []
    for deal in deals[:10]:  # First 10 deals
        result["deals"].append({
            "ticket": deal.ticket,
            "time": deal.time,
            "type": deal.type,
            "entry": deal.entry,
            "volume": deal.volume,
            "price": deal.price,
            "profit": deal.profit,
            "symbol": deal.symbol,
            "comment": deal.comment
        })

# Get orders
orders = mt5.history_orders_get(date_from, date_to, group="*")
if orders:
    result["total_orders"] = len(orders)

mt5.shutdown()
print(json.dumps(result, default=str))
EOF
    
    # Try to run it (may need to check if Python MT5 library works)
    echo "Running test script..."
    python3 /tmp/test_account_${LOGIN}.py 2>&1 | head -50 || echo -e "${RED}❌ Failed to run test${NC}"
    
    rm -f /tmp/test_account_${LOGIN}.py
    
    echo ""
done

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
