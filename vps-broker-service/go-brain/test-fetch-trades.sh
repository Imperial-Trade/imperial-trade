#!/bin/bash
# Test fetching trade logs from MT5 containers on VPS

set -e

echo "📊 Testing Trade Log Retrieval from MT5 Containers"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check running containers
CONTAINERS=$(docker ps --format '{{.Names}}' | grep worker || echo "")

if [ -z "$CONTAINERS" ]; then
    echo -e "${YELLOW}⚠️  No worker containers are currently running${NC}"
    echo "Checking for stopped containers..."
    STOPPED=$(docker ps -a --format '{{.Names}}' | grep worker | head -1 || echo "")
    if [ -n "$STOPPED" ]; then
        echo -e "${YELLOW}Found stopped container: $STOPPED${NC}"
        echo "Starting it temporarily for testing..."
        docker start "$STOPPED"
        sleep 5
        CONTAINERS="$STOPPED"
    else
        echo -e "${RED}❌ No containers found. Go Brain may need to create them.${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}Found containers:${NC}"
echo "$CONTAINERS"
echo ""

# Test each container
for container in $CONTAINERS; do
    echo ""
    echo "=========================================="
    echo -e "${YELLOW}Testing Container: $container${NC}"
    echo "=========================================="
    
    # Get credentials from launch.ini
    LOGIN=$(docker exec "$container" cat /mt5/config/launch.ini 2>/dev/null | grep '^Login=' | cut -d'=' -f2 | head -1 || echo "")
    PASSWORD=$(docker exec "$container" cat /mt5/config/launch.ini 2>/dev/null | grep '^Password=' | cut -d'=' -f2 | head -1 || echo "")
    SERVER=$(docker exec "$container" cat /mt5/config/launch.ini 2>/dev/null | grep '^Server=' | cut -d'=' -f2 | head -1 || echo "")
    
    if [ -z "$LOGIN" ] || [ -z "$SERVER" ]; then
        echo -e "${RED}❌ Could not read credentials from launch.ini${NC}"
        continue
    fi
    
    echo "Login: $LOGIN"
    echo "Server: $SERVER"
    echo "Password: ${PASSWORD:0:5}... (hidden)"
    
    # Check if credentials are encrypted
    if echo "$LOGIN" | grep -q ":"; then
        echo -e "${RED}❌ Credentials appear to be encrypted (decryption needed)${NC}"
        continue
    fi
    
    # Check if MT5 is running
    MT5_RUNNING=$(docker exec "$container" ps aux 2>/dev/null | grep -E 'terminal64.exe' | wc -l || echo "0")
    if [ "$MT5_RUNNING" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  MT5 terminal process not running in container${NC}"
    else
        echo -e "${GREEN}✅ MT5 terminal process is running${NC}"
    fi
    
    # Try to check MT5 logs directory
    echo ""
    echo "Checking MT5 log files..."
    LOG_FILES=$(docker exec "$container" find /mt5 -name "*.log" -o -name "*.txt" 2>/dev/null | grep -E 'history|trades|deals' | head -5 || echo "")
    if [ -n "$LOG_FILES" ]; then
        echo -e "${GREEN}Found log files:${NC}"
        echo "$LOG_FILES"
    else
        echo -e "${YELLOW}⚠️  No trade log files found${NC}"
    fi
    
    # Check accounts directory
    echo ""
    echo "Checking MT5 data directory..."
    ACCOUNTS_DIR=$(docker exec "$container" ls -la /mt5/config/ 2>/dev/null | head -10 || echo "")
    if [ -n "$ACCOUNTS_DIR" ]; then
        echo -e "${GREEN}Config directory contents:${NC}"
        echo "$ACCOUNTS_DIR"
    fi
    
    # Check if Python MT5 library is available in container
    echo ""
    echo "Checking for Python MT5 library..."
    PYTHON_AVAILABLE=$(docker exec "$container" which python3 2>/dev/null || echo "")
    if [ -z "$PYTHON_AVAILABLE" ]; then
        echo -e "${YELLOW}⚠️  Python3 not available in container${NC}"
        echo "Note: Trade fetching would require Python scripts to be added to container"
    else
        echo -e "${GREEN}✅ Python3 available${NC}"
    fi
    
    echo ""
done

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
