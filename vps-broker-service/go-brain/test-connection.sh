#!/bin/bash
# Quick connection test script
# Tests database connectivity from the VPS

echo "🔍 Testing Database Connections..."
echo ""

DATABASE_URL="postgres://postgres.kmuoqkcxguafxulqlbmi:Tradeimperial%40315@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require"
LISTENER_URL="postgres://postgres.kmuoqkcxguafxulqlbmi:Tradeimperial%40315@db.kmuoqkcxguafxulqlbmi.supabase.co:5432/postgres?sslmode=require"

echo "1. Testing pooler connection (DATABASE_URL)..."
if command -v psql &> /dev/null; then
    timeout 5 psql "$DATABASE_URL" -c "SELECT 1;" && echo "✅ Pooler connection: OK" || echo "❌ Pooler connection: FAILED"
else
    echo "⚠️  psql not installed. Install with: apt-get install postgresql-client"
fi

echo ""
echo "2. Testing direct connection (LISTENER_DATABASE_URL)..."
if command -v psql &> /dev/null; then
    timeout 5 psql "$LISTENER_URL" -c "SELECT 1;" && echo "✅ Direct connection: OK" || echo "❌ Direct connection: FAILED"
else
    echo "⚠️  psql not installed"
fi

echo ""
echo "3. Testing LISTEN capability..."
if command -v psql &> /dev/null; then
    timeout 3 psql "$LISTENER_URL" -c "LISTEN test_channel;" && echo "✅ LISTEN capability: OK" || echo "❌ LISTEN capability: FAILED"
else
    echo "⚠️  psql not installed"
fi

echo ""
echo "Done!"
