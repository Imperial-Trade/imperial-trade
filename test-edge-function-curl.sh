#!/bin/bash

# Direct Test of Edge Function → VPS → MT5 Flow
# Tests the Edge Function directly using curl (not through frontend)

echo "🧪 Testing Edge Function → VPS → MT5 Flow"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Configuration
SUPABASE_URL="https://kmuoqkcxguafxulqlbmi.supabase.co"
EDGE_FUNCTION_URL="${SUPABASE_URL}/functions/v1/test-broker-connection"

# You need to provide:
# 1. A valid user session token (get from browser after logging in)
# 2. Encrypted credentials (or we can use a test script to encrypt them)

echo "⚠️  To test this, you need:"
echo "   1. A valid Supabase session token (Authorization header)"
echo "   2. Encrypted credentials (encrypted_login, encrypted_password, encrypted_server)"
echo ""
echo "📝 Option 1: Test from browser console after logging in"
echo "📝 Option 2: Use the Node.js test script (test-edge-function-direct.js)"
echo ""
echo "🔗 Edge Function URL: ${EDGE_FUNCTION_URL}"
echo ""
echo "Example curl command (requires session token and encrypted credentials):"
echo ""
echo "curl -X POST '${EDGE_FUNCTION_URL}' \\"
echo "  -H 'Authorization: Bearer YOUR_SESSION_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'apikey: YOUR_ANON_KEY' \\"
echo "  -d '{"
echo "    \"broker_type\": \"ecmarkets\","
echo "    \"encrypted_login\": \"ENCRYPTED_LOGIN\","
echo "    \"encrypted_password\": \"ENCRYPTED_PASSWORD\","
echo "    \"encrypted_server\": \"ENCRYPTED_SERVER\""
echo "  }'"
echo ""
