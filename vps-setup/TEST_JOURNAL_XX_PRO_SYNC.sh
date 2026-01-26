#!/bin/bash
# ============================================================================
# TEST JOURNAL XX PRO SYNC - END-TO-END
# ============================================================================
# Tests the full sync flow from Journal XX Pro (Edge Function -> VPS -> MT5)
# ============================================================================

SUPABASE_URL="https://kmuoqkcxguafxulqlbmi.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MDI5NjYsImV4cCI6MjA3MzE3ODk2Nn0.m6vaoaT7X7VvcKaY3W3aVEi5ZjqitAjQAJbyYnps_sc"

# Connection IDs from database
CONNECTIONS=(
  "ef59770a-87c0-478d-8296-829469394bc1"  # PU Prime
  "c46a3b1b-6331-44c9-98fb-2df8e0db843a"  # XS
  "c1303009-5f2b-4851-ba7c-5725a6eda4f2"  # EC Markets Demo
)

echo "================================================================================"
echo "  TESTING JOURNAL XX PRO SYNC - END-TO-END"
echo "================================================================================"
echo ""
echo "This simulates the sync flow from Journal XX Pro:"
echo "  1. Frontend calls Edge Function (sync-broker-trades)"
echo "  2. Edge Function calls VPS Broker Service"
echo "  3. VPS Service connects to MT5 and fetches trades"
echo "  4. Trades are saved to Supabase"
echo ""

for i in "${!CONNECTIONS[@]}"; do
  CONNECTION_ID="${CONNECTIONS[$i]}"
  NUM=$((i + 1))
  TOTAL=${#CONNECTIONS[@]}
  
  echo "================================================================================"
  echo "  TEST $NUM/$TOTAL: Connection ${CONNECTION_ID:0:8}..."
  echo "================================================================================"
  echo ""
  
  echo "[$NUM/$TOTAL] Calling Edge Function (sync-broker-trades)..."
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "${SUPABASE_URL}/functions/v1/sync-broker-trades" \
    -H "Authorization: Bearer ${ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"connection_id\": \"${CONNECTION_ID}\"
    }" \
    --max-time 60)
  
  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')
  
  echo "[$NUM/$TOTAL] HTTP Status: ${HTTP_STATUS}"
  echo ""
  
  if [ "$HTTP_STATUS" = "200" ]; then
    TRADES_SYNCED=$(echo "$BODY" | jq -r '.trades_synced // 0' 2>/dev/null || echo "0")
    SUCCESS=$(echo "$BODY" | jq -r '.success // false' 2>/dev/null || echo "false")
    
    if [ "$SUCCESS" = "true" ]; then
      echo "✅ SUCCESS: Connection ${CONNECTION_ID:0:8}"
      echo "   📊 Trades synced: ${TRADES_SYNCED}"
      
      # Show account balance if available
      BALANCE=$(echo "$BODY" | jq -r '.account_balance // null' 2>/dev/null || echo "null")
      if [ "$BALANCE" != "null" ]; then
        echo "   💰 Account balance: ${BALANCE}"
      fi
      
      # Show server used
      SERVER_USED=$(echo "$BODY" | jq -r '.server_used // null' 2>/dev/null || echo "null")
      if [ "$SERVER_USED" != "null" ]; then
        echo "   📍 Server used: ${SERVER_USED}"
      fi
    else
      ERROR=$(echo "$BODY" | jq -r '.error // "Unknown error"' 2>/dev/null || echo "Unknown error")
      echo "❌ FAILED: Connection ${CONNECTION_ID:0:8}"
      echo "   Error: ${ERROR}"
    fi
  elif [ "$HTTP_STATUS" = "401" ]; then
    echo "❌ UNAUTHORIZED: Connection ${CONNECTION_ID:0:8} (401)"
    echo "   💡 Edge Function requires user authentication token"
    echo "   💡 This is expected - Journal XX Pro uses authenticated requests"
  elif [ "$HTTP_STATUS" = "504" ]; then
    echo "❌ TIMEOUT: Connection ${CONNECTION_ID:0:8} (504)"
    echo "   💡 VPS service may be slow or unresponsive"
  else
    ERROR=$(echo "$BODY" | jq -r '.error // "Unknown error"' 2>/dev/null || echo "Unknown error")
    echo "❌ ERROR: Connection ${CONNECTION_ID:0:8} (HTTP ${HTTP_STATUS})"
    echo "   Error: ${ERROR}"
  fi
  
  echo ""
  
  # Wait between tests
  if [ $NUM -lt $TOTAL ]; then
    echo "Waiting 3 seconds before next test..."
    sleep 3
    echo ""
  fi
done

echo "================================================================================"
echo "  TEST COMPLETE"
echo "================================================================================"
echo ""
echo "Note: 401 Unauthorized is expected when testing without user auth token."
echo "Journal XX Pro will use authenticated requests, which will work correctly."
echo ""


