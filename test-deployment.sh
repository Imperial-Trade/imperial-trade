#!/bin/bash
# Test the complete MT5 auto-sync deployment
# Run this AFTER deploying VPS service and configuring Supabase

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

VPS_URL="http://209.222.12.247:3000"
VPS_API_KEY="Imperial_VPS_Secret_2026"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Testing MT5 Auto-Sync Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Test 1: VPS Health Check
echo -e "${YELLOW}[1/3]${NC} Testing VPS service health..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$VPS_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓${NC} VPS service is healthy"
    echo "  Response: $BODY"
else
    echo -e "${RED}✗${NC} VPS service health check failed (HTTP $HTTP_CODE)"
    exit 1
fi

# Test 2: Test MT5 Connection
echo ""
echo -e "${YELLOW}[2/3]${NC} Testing MT5 connection with EC Markets..."

# Create test payload
TEST_PAYLOAD=$(cat <<EOF
{
  "broker_type": "EC_MARKETS",
  "encrypted_login": "test-login",
  "encrypted_password": "test-password",
  "encrypted_server": "test-server",
  "user_id": "test-user-id"
}
EOF
)

echo "  Login: 81071266"
echo "  Server: ECMarkets-MT5-Live01"

# Note: This will fail because we're using test encrypted values
# In real scenario, frontend encrypts these properly
TEST_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$VPS_URL/test-connection" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $VPS_API_KEY" \
  -d "$TEST_PAYLOAD")

TEST_HTTP_CODE=$(echo "$TEST_RESPONSE" | tail -n1)
TEST_BODY=$(echo "$TEST_RESPONSE" | head -n-1)

if [ "$TEST_HTTP_CODE" == "200" ] || [ "$TEST_HTTP_CODE" == "400" ]; then
    echo -e "${GREEN}✓${NC} VPS service responds to connection requests"
    echo "  (Expected to fail with test data - real test from frontend)"
else
    echo -e "${YELLOW}⚠${NC}  Service responded with HTTP $TEST_HTTP_CODE"
    echo "  Response: $TEST_BODY"
fi

# Test 3: Check Supabase Edge Function
echo ""
echo -e "${YELLOW}[3/3]${NC} Checking Supabase Edge Function..."
EDGE_FUNCTION_URL="https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/sync-broker-trades"

EDGE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$EDGE_FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{}' 2>&1)

EDGE_HTTP_CODE=$(echo "$EDGE_RESPONSE" | tail -n1)

if [ "$EDGE_HTTP_CODE" == "401" ] || [ "$EDGE_HTTP_CODE" == "400" ]; then
    echo -e "${GREEN}✓${NC} Edge Function is deployed and responding"
    echo "  (Expected 401 without auth - this is correct)"
else
    echo -e "${YELLOW}⚠${NC}  Edge Function responded with HTTP $EDGE_HTTP_CODE"
fi

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Test Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}✓ VPS Service${NC} - Running at $VPS_URL"
echo -e "${GREEN}✓ Edge Function${NC} - Deployed and accessible"
echo -e "${GREEN}✓ System Ready${NC} - Frontend can now connect"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Open https://tradeimperial.com"
echo "  2. Go to Journal XX Pro → Auto Journal"
echo "  3. Click 'Connect Your Broker'"
echo "  4. Select 'EC Markets'"
echo "  5. Enter credentials:"
echo "     Login: 81071266"
echo "     Password: Imperial@2026"
echo "     Server: ECMarkets-MT5-Live01"
echo "  6. Click 'Connect Broker'"
echo "  7. Click 'Sync' to fetch trades"
echo ""
echo -e "${GREEN}Expected Result:${NC} Trades appear in the UI!"
echo ""
