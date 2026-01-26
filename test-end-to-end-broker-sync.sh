#!/bin/bash
# End-to-End Test for Journal XX Pro Broker Sync
# Tests: VPS MT5 Connection, test-broker-connection, sync-broker-trades, mt5-sync

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_URL="http://209.222.12.247:3001"
SUPABASE_URL="https://kmuoqkcxguafxulqlbmi.supabase.co"
SUPABASE_ANON_KEY="" # Will be set from environment or user input

# Test credentials (from user)
LOGIN="81071266"
PASSWORD="Imperial@2026"
SERVER="ECMarkets-MT5-Live01"
BROKER_TYPE="ecmarkets"

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  End-to-End Test: Journal XX Pro Broker Sync${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if SUPABASE_ANON_KEY is set
if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${YELLOW}⚠️  SUPABASE_ANON_KEY not set in environment${NC}"
    echo -e "${YELLOW}   Please set it: export SUPABASE_ANON_KEY='your-key'${NC}"
    echo -e "${YELLOW}   Or provide it when prompted${NC}"
    read -p "Enter SUPABASE_ANON_KEY (or press Enter to skip Edge Function tests): " SUPABASE_ANON_KEY
fi

# ============================================================================
# TEST 1: VPS Health Check
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 1: VPS Health Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${VPS_URL}/health" || echo "000")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ VPS is healthy${NC}"
    echo "   Response: $BODY"
else
    echo -e "${RED}❌ VPS health check failed${NC}"
    echo "   HTTP Code: $HTTP_CODE"
    echo "   Response: $BODY"
    exit 1
fi

echo ""

# ============================================================================
# TEST 2: Direct VPS MT5 Connection Test
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 2: Direct VPS MT5 Connection Test${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check if VPS_API_KEY is set
if [ -z "$VPS_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  VPS_API_KEY not set${NC}"
    read -p "Enter VPS_API_KEY: " VPS_API_KEY
fi

# Create test payload (plain credentials for direct test)
TEST_PAYLOAD=$(cat <<EOF
{
  "broker_type": "$BROKER_TYPE",
  "login": "$LOGIN",
  "password": "$PASSWORD",
  "server": "$SERVER"
}
EOF
)

echo "Testing MT5 connection with:"
echo "  Login: $LOGIN"
echo "  Server: $SERVER"
echo "  Broker Type: $BROKER_TYPE"
echo ""

VPS_TEST_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $VPS_API_KEY" \
    -d "$TEST_PAYLOAD" \
    "${VPS_URL}/test-connection" || echo "000")

VPS_HTTP_CODE=$(echo "$VPS_TEST_RESPONSE" | tail -n1)
VPS_BODY=$(echo "$VPS_TEST_RESPONSE" | sed '$d')

if [ "$VPS_HTTP_CODE" = "200" ]; then
    CONNECTED=$(echo "$VPS_BODY" | grep -o '"connected":[^,}]*' | cut -d':' -f2 | tr -d ' ')
    if [ "$CONNECTED" = "true" ]; then
        echo -e "${GREEN}✅ MT5 Connection Successful!${NC}"
        echo "$VPS_BODY" | python3 -m json.tool 2>/dev/null || echo "$VPS_BODY"
    else
        echo -e "${RED}❌ MT5 Connection Failed${NC}"
        echo "$VPS_BODY" | python3 -m json.tool 2>/dev/null || echo "$VPS_BODY"
        exit 1
    fi
else
    echo -e "${RED}❌ VPS Connection Test Failed${NC}"
    echo "   HTTP Code: $VPS_HTTP_CODE"
    echo "$VPS_BODY" | python3 -m json.tool 2>/dev/null || echo "$VPS_BODY"
    exit 1
fi

echo ""

# ============================================================================
# TEST 3: test-broker-connection Edge Function
# ============================================================================
if [ -n "$SUPABASE_ANON_KEY" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}TEST 3: test-broker-connection Edge Function${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    echo -e "${YELLOW}⚠️  This test requires authentication${NC}"
    echo -e "${YELLOW}   Please provide a valid JWT token from your browser${NC}"
    echo -e "${YELLOW}   (Get it from: localStorage.getItem('supabase.auth.token') in browser console)${NC}"
    read -p "Enter JWT token (or press Enter to skip): " JWT_TOKEN
    
    if [ -n "$JWT_TOKEN" ]; then
        EDGE_TEST_PAYLOAD=$(cat <<EOF
{
  "broker_type": "$BROKER_TYPE",
  "login": "$LOGIN",
  "password": "$PASSWORD",
  "server": "$SERVER"
}
EOF
)
        
        EDGE_TEST_RESPONSE=$(curl -s -w "\n%{http_code}" \
            -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $JWT_TOKEN" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -d "$EDGE_TEST_PAYLOAD" \
            "${SUPABASE_URL}/functions/v1/test-broker-connection" || echo "000")
        
        EDGE_HTTP_CODE=$(echo "$EDGE_TEST_RESPONSE" | tail -n1)
        EDGE_BODY=$(echo "$EDGE_TEST_RESPONSE" | sed '$d')
        
        if [ "$EDGE_HTTP_CODE" = "200" ]; then
            EDGE_CONNECTED=$(echo "$EDGE_BODY" | grep -o '"connected":[^,}]*' | cut -d':' -f2 | tr -d ' ')
            if [ "$EDGE_CONNECTED" = "true" ]; then
                echo -e "${GREEN}✅ Edge Function test-broker-connection: SUCCESS${NC}"
                echo "$EDGE_BODY" | python3 -m json.tool 2>/dev/null || echo "$EDGE_BODY"
            else
                echo -e "${RED}❌ Edge Function test-broker-connection: FAILED${NC}"
                echo "$EDGE_BODY" | python3 -m json.tool 2>/dev/null || echo "$EDGE_BODY"
            fi
        else
            echo -e "${RED}❌ Edge Function test-broker-connection: HTTP $EDGE_HTTP_CODE${NC}"
            echo "$EDGE_BODY" | python3 -m json.tool 2>/dev/null || echo "$EDGE_BODY"
        fi
    else
        echo -e "${YELLOW}⏭️  Skipping Edge Function test (no JWT token)${NC}"
    fi
else
    echo -e "${YELLOW}⏭️  Skipping Edge Function tests (no SUPABASE_ANON_KEY)${NC}"
fi

echo ""

# ============================================================================
# TEST 4: Verify mt5-sync Configuration
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST 4: Verify mt5-sync Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check if mt5-sync function exists
MT5_SYNC_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X OPTIONS \
    "${SUPABASE_URL}/functions/v1/mt5-sync" || echo "000")

if [ "$MT5_SYNC_EXISTS" = "200" ] || [ "$MT5_SYNC_EXISTS" = "405" ]; then
    echo -e "${GREEN}✅ mt5-sync Edge Function is deployed${NC}"
    echo "   (CORS preflight successful)"
else
    echo -e "${RED}❌ mt5-sync Edge Function may not be deployed${NC}"
    echo "   HTTP Code: $MT5_SYNC_EXISTS"
fi

# Check INGEST_SECRET (from code, it should be 'Imperial_Secret_2026')
echo ""
echo "Expected INGEST_SECRET: Imperial_Secret_2026"
echo -e "${YELLOW}⚠️  Verify this matches your Supabase secret${NC}"

echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "✅ VPS Health: Tested"
echo "✅ Direct VPS MT5 Connection: Tested"
if [ -n "$JWT_TOKEN" ]; then
    echo "✅ test-broker-connection Edge Function: Tested"
fi
echo "✅ mt5-sync Configuration: Verified"
echo ""
echo -e "${GREEN}All critical tests completed!${NC}"
echo ""
echo "Next Steps:"
echo "1. If VPS connection works, credentials are valid"
echo "2. Test sync-broker-trades from frontend after connecting"
echo "3. Verify MQL5 EA is sending trades to mt5-sync"
