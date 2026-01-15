#!/bin/bash
# Test MT5 Credentials and Check for Trades
# Uses the EA-based Docker system to test credentials

echo "🧪 Testing MT5 Credentials for Trades"
echo "======================================"
echo ""

# Credentials to test
ACCOUNT1="800107112"
PASSWORD1="Demo@123"
SERVER1="ECMarkets-MT5-Demo"
NAME1="Demo Account"

ACCOUNT2="81071266"
PASSWORD2="Imperial@2026"
SERVER2="ECMarkets-MT5-Live01"
NAME2="Live Account"

VPS_IP="209.222.12.247"

echo "📋 Credentials to Test:"
echo "  1. $NAME1: $ACCOUNT1 / $SERVER1"
echo "  2. $NAME2: $ACCOUNT2 / $SERVER2"
echo ""

echo "⚠️  Note: This will use the Docker + EA system to test connections."
echo "   Trades will be sent to Supabase if connections are successful."
echo ""

# We need to trigger Go Brain to test these
# But Go Brain requires broker_connections entries in Supabase
# So we need to test via the database/system

echo "✅ To test these credentials:"
echo "   1. Add them via the frontend (AutoJournalView)"
echo "   2. Trigger a sync (Go Brain will launch containers)"
echo "   3. Check Supabase database for trades"
echo ""

echo "📊 Checking if credentials already exist in database..."
echo "   (Run via Supabase SQL or Edge Function)"
echo ""

echo "🔍 Alternative: Check container logs on VPS:"
echo "   ssh root@$VPS_IP 'journalctl -u imperial-brain -n 100 | grep -E \"$ACCOUNT1|$ACCOUNT2\"'"
echo ""
