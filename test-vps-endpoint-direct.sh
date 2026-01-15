#!/bin/bash
# Test VPS endpoint directly with encrypted credentials
# This simulates what the Edge Function would send

VPS_URL="http://45.32.89.134:3001"
API_KEY="imperial-trade-vps-api-key-2025-secure-random-string-xyz789abc"

echo "Testing VPS /health endpoint..."
echo "================================"
curl -s "$VPS_URL/health" | jq '.' || curl -s "$VPS_URL/health"
echo -e "\n"

echo "Testing VPS /test-connection endpoint with mock encrypted data..."
echo "=================================================================="
# Note: This is a mock test - real encrypted data would come from Edge Function
MOCK_ENCRYPTED_DATA='{
  "encrypted_login": "mock_encrypted_login_base64",
  "encrypted_password": "mock_encrypted_password_base64", 
  "encrypted_server": "mock_encrypted_server_base64",
  "user_id": "test-user-id-12345"
}'

echo "Sending test request..."
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "$MOCK_ENCRYPTED_DATA" \
  "$VPS_URL/test-connection")

http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

echo "Response HTTP Code: $http_code"
echo "Response Body:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"







