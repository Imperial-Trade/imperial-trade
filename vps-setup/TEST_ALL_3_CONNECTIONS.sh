#!/bin/bash
# ============================================================================
# TEST ALL 3 BROKER CONNECTIONS - END-TO-END
# ============================================================================
# Tests all 3 broker connections created from the user's accounts
# ============================================================================

SUPABASE_URL="https://kmuoqkcxguafxulqlbmi.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MDI5NjYsImV4cCI6MjA3MzE3ODk2Nn0.m6vaoaT7X7VvcKaY3W3aVEi5ZjqitAjQAJbyYnps_sc"

echo "================================================================================"
echo "  TESTING ALL 3 BROKER CONNECTIONS - END-TO-END"
echo "================================================================================"
echo ""

# Array of connection IDs (will be populated from database)
declare -a CONNECTION_IDS

# Get connection IDs from database (simplified - would need to query first)
# For now, expect them as arguments or query via SQL
if [ $# -eq 0 ]; then
    echo "⚠️  No connection IDs provided"
    echo ""
    echo "Usage: $0 <connection_id_1> <connection_id_2> <connection_id_3>"
    echo ""
    echo "Or query first:"
    echo "  SELECT id FROM broker_connections WHERE is_active = true;"
    echo ""
    exit 1
fi

CONNECTION_IDS=("$@")
TOTAL=${#CONNECTION_IDS[@]}

echo "Testing $TOTAL broker connections..."
echo ""

SUCCESS_COUNT=0
FAIL_COUNT=0

for i in "${!CONNECTION_IDS[@]}"; do
    CONNECTION_ID="${CONNECTION_IDS[$i]}"
    NUM=$((i + 1))
    
    echo "================================================================================"
    echo "  TEST $NUM/$TOTAL: Connection ${CONNECTION_ID:0:8}..."
    echo "================================================================================"
    echo ""
    
    echo "[$NUM/$TOTAL] Sending request to Edge Function..."
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
            ((SUCCESS_COUNT++))
            
            # Show account balance if available
            BALANCE=$(echo "$BODY" | jq -r '.account_balance // null' 2>/dev/null || echo "null")
            if [ "$BALANCE" != "null" ]; then
                echo "   💰 Account balance: ${BALANCE}"
            fi
        else
            ERROR=$(echo "$BODY" | jq -r '.error // "Unknown error"' 2>/dev/null || echo "Unknown error")
            echo "❌ FAILED: Connection ${CONNECTION_ID:0:8}"
            echo "   Error: ${ERROR}"
            ((FAIL_COUNT++))
        fi
    elif [ "$HTTP_STATUS" = "504" ]; then
        echo "❌ TIMEOUT: Connection ${CONNECTION_ID:0:8} (504)"
        echo "   💡 VPS service may be slow or unresponsive"
        ((FAIL_COUNT++))
    elif [ "$HTTP_STATUS" = "404" ]; then
        echo "❌ NOT FOUND: Connection ${CONNECTION_ID:0:8} (404)"
        echo "   💡 Connection may not exist or is inactive"
        ((FAIL_COUNT++))
    elif [ "$HTTP_STATUS" = "401" ]; then
        echo "❌ UNAUTHORIZED: Connection ${CONNECTION_ID:0:8} (401)"
        echo "   💡 Check authentication token"
        ((FAIL_COUNT++))
    else
        ERROR=$(echo "$BODY" | jq -r '.error // "Unknown error"' 2>/dev/null || echo "Unknown error")
        echo "❌ ERROR: Connection ${CONNECTION_ID:0:8} (HTTP ${HTTP_STATUS})"
        echo "   Error: ${ERROR}"
        ((FAIL_COUNT++))
    fi
    
    echo ""
    
    # Wait between tests to avoid overwhelming the service
    if [ $NUM -lt $TOTAL ]; then
        echo "Waiting 3 seconds before next test..."
        sleep 3
        echo ""
    fi
done

echo "================================================================================"
echo "  TEST RESULTS SUMMARY"
echo "================================================================================"
echo ""
echo "Total connections tested: $TOTAL"
echo "✅ Successful: $SUCCESS_COUNT"
echo "❌ Failed: $FAIL_COUNT"
echo ""

if [ $SUCCESS_COUNT -eq $TOTAL ]; then
    echo "🎉 ALL CONNECTIONS WORKING!"
    exit 0
elif [ $SUCCESS_COUNT -gt 0 ]; then
    echo "⚠️  SOME CONNECTIONS WORKING"
    exit 1
else
    echo "❌ ALL CONNECTIONS FAILED"
    exit 1
fi


