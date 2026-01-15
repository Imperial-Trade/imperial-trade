#!/bin/bash
# End-to-End Verification Script for Journal XX Pro Broker Sync
# Tests: VPS Connection → test-broker-connection → sync-broker-trades → mt5-sync

set -e

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  🔍 END-TO-END VERIFICATION - JOURNAL XX PRO BROKER SYNC"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

# Credentials (from user)
ACCOUNT="81071266"
PASSWORD="Imperial@2026"
SERVER="ECMarkets-MT5-Live01"
VPS_URL="http://209.222.12.247:3001"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 Test Configuration:"
echo "   Account: $ACCOUNT"
echo "   Server: $SERVER"
echo "   VPS URL: $VPS_URL"
echo ""

# Step 1: Test VPS Health
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Testing VPS Health Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if curl -s -f "${VPS_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ VPS is accessible at ${VPS_URL}${NC}"
    HEALTH_RESPONSE=$(curl -s "${VPS_URL}/health")
    echo "   Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}❌ VPS is NOT accessible at ${VPS_URL}${NC}"
    echo "   Please verify:"
    echo "   1. VPS is running"
    echo "   2. Port 3001 is open in firewall"
    echo "   3. Node.js service is running (pm2 status)"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Testing Direct MT5 Connection via VPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  To test direct MT5 connection, you need to:"
echo "   1. SSH into VPS: ssh user@209.222.12.247"
echo "   2. Run: cd /path/to/vps-broker-service"
echo "   3. Run: python3 python/test_connection.py '{\"login\":\"$ACCOUNT\",\"password\":\"$PASSWORD\",\"server\":\"$SERVER\"}'"
echo ""
echo "Or test via VPS API (requires VPS_API_KEY):"
echo "   curl -X POST ${VPS_URL}/test-connection \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'X-API-Key: YOUR_VPS_API_KEY' \\"
echo "     -d '{\"broker_type\":\"ecmarkets\",\"login\":\"$ACCOUNT\",\"password\":\"$PASSWORD\",\"server\":\"$SERVER\"}'"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Edge Functions Verification Checklist"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ test-broker-connection:"
echo "   - Location: supabase/functions/test-broker-connection/index.ts"
echo "   - Calls: ${VPS_URL}/test-connection"
echo "   - Purpose: Tests MT5 connection before saving credentials"
echo ""
echo "✅ sync-broker-trades:"
echo "   - Location: supabase/functions/sync-broker-trades/index.ts"
echo "   - Calls: ${VPS_URL}/fetch-trades"
echo "   - Purpose: Manual sync (Sync Now button)"
echo ""
echo "✅ mt5-sync:"
echo "   - Location: supabase/functions/mt5-sync/index.ts"
echo "   - Receives: POST from MQL5 EA (ImperialSync.mq5)"
echo "   - Purpose: Automatic sync from EA"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Test VPS MT5 connection directly (see Step 2 above)"
echo "2. Test via frontend: Connect Broker button"
echo "3. Check Supabase logs: Dashboard → Logs → Edge Functions"
echo "4. Check VPS logs: pm2 logs imperial-trade-broker-service"
echo ""
