#!/bin/bash
# ============================================================================
# TEST EDGE FUNCTION END-TO-END AUTOSYNC
# ============================================================================
# Tests the complete flow:
# 1. Edge Function → VPS Service
# 2. VPS Service → Python MT5 Script  
# 3. Python Script → Generic MT5
# 4. Generic MT5 → Fetch trades
# 5. Return trades → Edge Function → Supabase
# ============================================================================

SUPABASE_URL="https://kmuoqkcxguafxulqlbmi.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MDI5NjYsImV4cCI6MjA3MzE3ODk2Nn0.m6vaoaT7X7VvcKaY3W3aVEi5ZjqitAjQAJbyYnps_sc"

echo "================================================================================"
echo "  TESTING EDGE FUNCTION: sync-broker-trades"
echo "================================================================================"
echo ""

# Check if connection_id is provided
if [ -z "$1" ]; then
    echo "❌ Error: connection_id is required"
    echo ""
    echo "Usage: $0 <connection_id> [auth_token]"
    echo ""
    echo "Example:"
    echo "  $0 123e4567-e89b-12d3-a456-426614174000"
    echo ""
    echo "To get connection_id, check broker_connections table:"
    echo "  SELECT id FROM broker_connections WHERE is_active = true LIMIT 1;"
    echo ""
    exit 1
fi

CONNECTION_ID="$1"
AUTH_TOKEN="${2:-$ANON_KEY}"

echo "[1/4] Testing Edge Function endpoint..."
echo "   📍 URL: ${SUPABASE_URL}/functions/v1/sync-broker-trades"
echo "   📍 Connection ID: ${CONNECTION_ID}"
echo ""

echo "[2/4] Sending request..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "${SUPABASE_URL}/functions/v1/sync-broker-trades" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"connection_id\": \"${CONNECTION_ID}\"
  }")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "[3/4] Response received..."
echo "   📍 HTTP Status: ${HTTP_STATUS}"
echo ""

echo "[4/4] Response body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ SUCCESS: Edge Function responded with 200 OK"
    
    # Check if trades were synced
    TRADES_SYNCED=$(echo "$BODY" | jq -r '.trades_synced // 0' 2>/dev/null || echo "0")
    if [ "$TRADES_SYNCED" != "null" ] && [ "$TRADES_SYNCED" != "0" ]; then
        echo "✅ Trades synced: ${TRADES_SYNCED}"
    else
        echo "⚠️  No trades synced (may be expected if no trades in MT5 history)"
    fi
    
    echo ""
    echo "💡 Check Edge Function logs at:"
    echo "   https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/logs/edge-functions"
    echo ""
elif [ "$HTTP_STATUS" = "401" ]; then
    echo "❌ ERROR: Unauthorized (401)"
    echo "💡 Provide a valid auth token as second argument"
    echo ""
elif [ "$HTTP_STATUS" = "404" ]; then
    echo "❌ ERROR: Broker connection not found (404)"
    echo "💡 Verify connection_id exists and is active"
    echo ""
elif [ "$HTTP_STATUS" = "504" ]; then
    echo "❌ ERROR: Request timeout (504)"
    echo "💡 VPS service may be slow or unresponsive"
    echo "💡 Check VPS service health: curl http://45.32.89.134:3001/health"
    echo ""
else
    echo "❌ ERROR: HTTP ${HTTP_STATUS}"
    echo "💡 Check response body above for details"
    echo ""
fi

echo "================================================================================"


