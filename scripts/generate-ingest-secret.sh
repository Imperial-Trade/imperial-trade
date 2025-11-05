#!/bin/bash

# Generate INGEST_SECRET for price-ingestor function
# This script generates a secure random secret and provides setup instructions

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║            INGEST_SECRET Generator & Setup Guide              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Generate a secure random secret
echo "🔐 Generating secure INGEST_SECRET..."
INGEST_SECRET=$(openssl rand -hex 32)

if [ -z "$INGEST_SECRET" ]; then
    echo "❌ Failed to generate secret. Make sure openssl is installed."
    exit 1
fi

echo -e "${GREEN}✅ Generated INGEST_SECRET:${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}${INGEST_SECRET}${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  Save this secret securely! You'll need it for the next steps."
echo ""

# Extract project info from .env
if [ -f .env ]; then
    SUPABASE_URL=$(grep VITE_SUPABASE_URL .env | cut -d'=' -f2 | tr -d '"')
    PROJECT_ID=$(echo "$SUPABASE_URL" | sed -n 's/.*https:\/\/\([^.]*\).*/\1/p')
fi

echo "═══════════════════════════════════════════════════════════════"
echo "                    SETUP INSTRUCTIONS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "Step 1: Configure in Supabase Dashboard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Open Supabase Dashboard:"
if [ -n "$PROJECT_ID" ]; then
    echo "   https://supabase.com/dashboard/project/${PROJECT_ID}"
else
    echo "   https://supabase.com/dashboard"
fi
echo ""
echo "2. Navigate to: Settings → Edge Functions → Manage Secrets"
echo ""
echo "3. Add a new secret:"
echo "   Key:   INGEST_SECRET"
echo "   Value: ${INGEST_SECRET}"
echo ""
echo "4. Click 'Save'"
echo ""

echo "Step 2: Export for Local Testing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run this command in your terminal:"
echo ""
echo -e "${CYAN}export INGEST_SECRET='${INGEST_SECRET}'${NC}"
echo ""
echo "Or add to your ~/.bashrc or ~/.zshrc for persistence:"
echo ""
echo -e "${CYAN}echo \"export INGEST_SECRET='${INGEST_SECRET}'\" >> ~/.bashrc${NC}"
echo ""

echo "Step 3: Verify Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "After setting the secret in Supabase, run:"
echo ""
echo -e "${CYAN}bash scripts/verify-price-ingestor-setup.sh${NC}"
echo ""

echo "Step 4: Test with Price Simulator"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Once configured, test the setup:"
echo ""
echo -e "${CYAN}cd test-scripts${NC}"
echo -e "${CYAN}export INGEST_SECRET='${INGEST_SECRET}'${NC}"
echo -e "${CYAN}node external-price-simulator.mjs --verbose${NC}"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "                    IMPORTANT NOTES"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🔒 Security:"
echo "   - Never commit this secret to git"
echo "   - Never share it publicly"
echo "   - Store it securely (password manager, vault, etc.)"
echo ""
echo "📝 Usage:"
echo "   - Set in Supabase Dashboard for production edge function"
echo "   - Export locally for testing with the simulator"
echo "   - Configure in your external price feed service"
echo ""
echo "🔄 Rotation:"
echo "   - If compromised, generate a new secret (run this script again)"
echo "   - Update in both Supabase and your price feed service"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "                    QUICK REFERENCE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Your INGEST_SECRET: ${INGEST_SECRET}"
echo ""
echo "Supabase Endpoint:  ${SUPABASE_URL}/functions/v1/price-ingestor"
echo "Required Header:    X-INGEST-KEY: ${INGEST_SECRET}"
echo ""

# Optionally save to a secure file
read -p "💾 Save secret to .ingest_secret.txt (gitignored)? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "$INGEST_SECRET" > .ingest_secret.txt
    chmod 600 .ingest_secret.txt
    echo ""
    # Add to .gitignore if not already there
    if ! grep -q "\.ingest_secret\.txt" .gitignore 2>/dev/null; then
        echo ".ingest_secret.txt" >> .gitignore
        echo "✅ Added .ingest_secret.txt to .gitignore"
    fi
    echo "✅ Secret saved to .ingest_secret.txt (file permissions: 600)"
    echo "   You can retrieve it later with: cat .ingest_secret.txt"
    echo ""
fi

echo "✅ Setup complete! Follow the steps above to configure your system."
echo ""
