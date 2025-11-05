#!/bin/bash

# Price Ingestor Setup Verification Script
# This script checks if the price ingestor is properly configured

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          Price Ingestor Setup Verification                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to check status
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        ((ERRORS++))
    fi
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

info() {
    echo -e "ℹ️  $1"
}

echo "Step 1: Checking local environment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if .env file exists
if [ -f .env ]; then
    check "Local .env file found"
else
    warn "Local .env file not found (this is OK for deployed functions)"
fi

# Check if Node.js is installed
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check "Node.js installed: $NODE_VERSION"
else
    warn "Node.js not installed (needed for test simulator)"
fi

# Check if price-ingestor function exists
if [ -f "supabase/functions/price-ingestor/index.ts" ]; then
    check "price-ingestor function file exists"
else
    echo -e "${RED}❌ price-ingestor function file NOT found${NC}"
    ((ERRORS++))
fi

echo ""
echo "Step 2: Checking Supabase configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Extract Supabase URL from .env
if [ -f .env ]; then
    SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d'=' -f2 | tr -d '"')
    if [ -n "$SUPABASE_URL" ]; then
        check "Supabase URL configured: $SUPABASE_URL"

        # Extract project ID
        PROJECT_ID=$(echo "$SUPABASE_URL" | sed -n 's/.*https:\/\/\([^.]*\).*/\1/p')
        info "Project ID: $PROJECT_ID"
    else
        warn "VITE_SUPABASE_URL not found in .env"
    fi
else
    warn "Cannot check Supabase URL (no .env file)"
fi

echo ""
echo "Step 3: Checking INGEST_SECRET..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "$INGEST_SECRET" ]; then
    SECRET_LENGTH=${#INGEST_SECRET}
    check "INGEST_SECRET environment variable is set (length: $SECRET_LENGTH)"

    if [ $SECRET_LENGTH -lt 32 ]; then
        warn "INGEST_SECRET is short (< 32 chars). Consider using a longer secret."
    fi
else
    warn "INGEST_SECRET environment variable NOT set in current shell"
    info "This must be set in Supabase Dashboard → Edge Functions → Secrets"
fi

echo ""
echo "Step 4: Testing price-ingestor endpoint..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "$SUPABASE_URL" ]; then
    ENDPOINT="$SUPABASE_URL/functions/v1/price-ingestor"

    info "Testing endpoint: $ENDPOINT"

    # Test without authentication (should return 401)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$ENDPOINT" \
        -H "Content-Type: application/json" \
        -d '{"prices": []}')

    if [ "$HTTP_CODE" = "401" ]; then
        check "Endpoint is reachable and requires authentication (401)"
    elif [ "$HTTP_CODE" = "500" ]; then
        warn "Endpoint returned 500 - INGEST_SECRET might not be configured in Supabase"
        info "Go to Supabase Dashboard → Edge Functions → Manage Secrets"
        info "Add secret: INGEST_SECRET = [your-secret-here]"
    elif [ "$HTTP_CODE" = "404" ]; then
        echo -e "${RED}❌ Endpoint not found (404) - Function may not be deployed${NC}"
        ((ERRORS++))
        info "Deploy with: supabase functions deploy price-ingestor"
    elif [ "$HTTP_CODE" = "000" ]; then
        echo -e "${RED}❌ Cannot connect to endpoint - Network error${NC}"
        ((ERRORS++))
    else
        warn "Unexpected HTTP code: $HTTP_CODE"
    fi
else
    warn "Cannot test endpoint (Supabase URL not found)"
fi

echo ""
echo "Step 5: Checking test simulator..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "test-scripts/external-price-simulator.mjs" ]; then
    check "Test simulator script exists"

    if command -v node &> /dev/null && [ -n "$INGEST_SECRET" ]; then
        info "You can test with: cd test-scripts && node external-price-simulator.mjs --verbose"
    fi
else
    warn "Test simulator script not found"
fi

echo ""
echo "Step 6: Checking database tables..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "To check if prices are being stored, run this SQL query:"
echo "  SELECT symbol, mid, timestamp FROM market_prices ORDER BY timestamp DESC LIMIT 5;"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "                        SUMMARY"
echo "═══════════════════════════════════════════════════════════════"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Setup looks good.${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Setup complete with $WARNINGS warning(s).${NC}"
    echo -e "${YELLOW}Review warnings above - they may not be critical.${NC}"
else
    echo -e "${RED}❌ Found $ERRORS error(s) and $WARNINGS warning(s).${NC}"
    echo -e "${RED}Please fix the errors above before proceeding.${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "                      NEXT STEPS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ $ERRORS -gt 0 ] || [ $WARNINGS -gt 0 ]; then
    echo "📖 Read the comprehensive fix guide:"
    echo "   cat PRICE_INGESTOR_FIX_GUIDE.md"
    echo ""
fi

if [ -z "$INGEST_SECRET" ]; then
    echo "🔐 Generate and set INGEST_SECRET:"
    echo "   1. Generate: openssl rand -hex 32"
    echo "   2. Set in Supabase Dashboard → Edge Functions → Secrets"
    echo "   3. Export locally: export INGEST_SECRET='your-secret-here'"
    echo ""
fi

if [ -f "test-scripts/external-price-simulator.mjs" ] && command -v node &> /dev/null; then
    echo "🧪 Test the setup:"
    echo "   cd test-scripts"
    echo "   export INGEST_SECRET='your-secret-here'"
    echo "   node external-price-simulator.mjs --verbose"
    echo ""
fi

echo "📊 Monitor edge function logs:"
echo "   Go to Supabase Dashboard → Edge Functions → price-ingestor → Logs"
echo ""

echo "✅ Verify database has prices:"
echo "   Go to Supabase Dashboard → SQL Editor"
echo "   Run: SELECT * FROM market_prices ORDER BY timestamp DESC LIMIT 10;"
echo ""

exit $ERRORS
