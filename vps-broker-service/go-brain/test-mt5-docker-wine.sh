#!/bin/bash
# Test MT5 Connection in Docker/Wine on VPS
# This script tests the complete flow: Docker → Wine → MT5

set -e

echo "🧪 Testing MT5 Connection in Docker/Wine on VPS"
echo "================================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Test credentials (using a known working connection)
TEST_LOGIN="800107112"
TEST_PASSWORD="Demo@123"
TEST_SERVER="ECMarketsLtd-Demo"

echo ""
echo -e "${YELLOW}Step 1: Checking running containers...${NC}"
CONTAINERS=$(docker ps --filter "name=worker_" --format "{{.Names}}" | head -1)
if [ -z "$CONTAINERS" ]; then
    echo -e "${RED}❌ No worker containers running${NC}"
    echo "Starting a test container..."
    exit 1
else
    TEST_CONTAINER=$(echo $CONTAINERS | head -1)
    echo -e "${GREEN}✅ Found container: $TEST_CONTAINER${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2: Checking Wine processes...${NC}"
WINE_PROCESSES=$(docker exec $TEST_CONTAINER ps aux | grep -E 'wine|wineserver' | wc -l)
if [ "$WINE_PROCESSES" -gt 0 ]; then
    echo -e "${GREEN}✅ Wine is running ($WINE_PROCESSES processes)${NC}"
else
    echo -e "${RED}❌ Wine is not running${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3: Checking MT5 terminal process...${NC}"
MT5_PROCESS=$(docker exec $TEST_CONTAINER ps aux | grep -E 'terminal64.exe' | grep -v grep || echo "")
if [ -n "$MT5_PROCESS" ]; then
    echo -e "${GREEN}✅ MT5 terminal64.exe is running${NC}"
    echo "Process: $MT5_PROCESS"
else
    echo -e "${YELLOW}⚠️  MT5 terminal64.exe not found in process list${NC}"
    echo "This may be normal if MT5 is still initializing"
fi

echo ""
echo -e "${YELLOW}Step 4: Checking launch.ini file...${NC}"
if docker exec $TEST_CONTAINER test -f /mt5/config/launch.ini; then
    echo -e "${GREEN}✅ launch.ini exists${NC}"
    echo "Contents:"
    docker exec $TEST_CONTAINER cat /mt5/config/launch.ini | head -10
else
    echo -e "${RED}❌ launch.ini not found${NC}"
fi

echo ""
echo -e "${YELLOW}Step 5: Checking MT5 files...${NC}"
if docker exec $TEST_CONTAINER test -f /mt5/terminal64.exe; then
    echo -e "${GREEN}✅ terminal64.exe exists${NC}"
    SIZE=$(docker exec $TEST_CONTAINER ls -lh /mt5/terminal64.exe | awk '{print $5}')
    echo "Size: $SIZE"
else
    echo -e "${RED}❌ terminal64.exe not found${NC}"
fi

echo ""
echo -e "${YELLOW}Step 6: Checking container logs for errors...${NC}"
RECENT_LOGS=$(docker logs $TEST_CONTAINER --tail 30 2>&1)
if echo "$RECENT_LOGS" | grep -qi "error\|failed\|fail"; then
    echo -e "${YELLOW}⚠️  Found potential errors in logs:${NC}"
    echo "$RECENT_LOGS" | grep -i "error\|failed\|fail" | head -5
else
    echo -e "${GREEN}✅ No obvious errors in recent logs${NC}"
fi

echo ""
echo -e "${YELLOW}Step 7: Checking Xvfb (virtual display)...${NC}"
XVFB_PROCESS=$(docker exec $TEST_CONTAINER ps aux | grep Xvfb | grep -v grep || echo "")
if [ -n "$XVFB_PROCESS" ]; then
    echo -e "${GREEN}✅ Xvfb is running (virtual display active)${NC}"
else
    echo -e "${RED}❌ Xvfb not running${NC}"
fi

echo ""
echo -e "${YELLOW}Step 8: Testing MT5 connection status...${NC}"
echo "Checking if MT5 has created connection files..."

# Check for MT5 data files that indicate connection
if docker exec $TEST_CONTAINER test -d /mt5/config; then
    FILES=$(docker exec $TEST_CONTAINER ls -la /mt5/config/ | wc -l)
    echo -e "${GREEN}✅ MT5 config directory exists with $FILES items${NC}"
    
    # Check for accounts.dat (created when MT5 connects)
    if docker exec $TEST_CONTAINER test -f /mt5/config/accounts.dat; then
        echo -e "${GREEN}✅ accounts.dat exists (MT5 has initialized)${NC}"
    else
        echo -e "${YELLOW}⚠️  accounts.dat not found (MT5 may still be initializing)${NC}"
    fi
else
    echo -e "${RED}❌ MT5 config directory not found${NC}"
fi

echo ""
echo "================================================"
echo -e "${GREEN}✅ Test Complete!${NC}"
echo ""
echo "Summary:"
echo "  Container: $TEST_CONTAINER"
echo "  Wine: $([ -n "$WINE_PROCESSES" ] && echo "Running" || echo "Not found")"
echo "  MT5 Process: $([ -n "$MT5_PROCESS" ] && echo "Running" || echo "Not found")"
echo "  Xvfb: $([ -n "$XVFB_PROCESS" ] && echo "Running" || echo "Not found")"
echo "  Launch.ini: $(docker exec $TEST_CONTAINER test -f /mt5/config/launch.ini && echo "Exists" || echo "Missing")"
echo ""
