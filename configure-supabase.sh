#!/bin/bash
# Script to configure Supabase Edge Function secrets
# Run this from your LOCAL MACHINE

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SUPABASE_TOKEN="sbp_b7a054723ccb57908638330e0ea71550d92febc6"
PROJECT_REF="kmuoqkcxguafxulqlbmi"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Supabase Secrets Configuration${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}Supabase CLI not found. Installing...${NC}"

    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install supabase/tap/supabase
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
        sudo mv supabase /usr/local/bin/supabase
    else
        echo "Please install Supabase CLI manually from: https://supabase.com/docs/guides/cli"
        exit 1
    fi
fi

echo -e "${YELLOW}[1/4]${NC} Linking to Supabase project..."
supabase link --project-ref "$PROJECT_REF" --token "$SUPABASE_TOKEN"
echo -e "${GREEN}✓${NC} Linked to project"

echo -e "${YELLOW}[2/4]${NC} Setting VPS_MT5_SERVICE_URL..."
supabase secrets set VPS_MT5_SERVICE_URL="http://209.222.12.247:3000" --token "$SUPABASE_TOKEN"
echo -e "${GREEN}✓${NC} VPS_MT5_SERVICE_URL set"

echo -e "${YELLOW}[3/4]${NC} Setting VPS_API_KEY..."
supabase secrets set VPS_API_KEY="Imperial_VPS_Secret_2026" --token "$SUPABASE_TOKEN"
echo -e "${GREEN}✓${NC} VPS_API_KEY set"

echo -e "${YELLOW}[4/4]${NC} Setting ENCRYPTION_SECRET..."
supabase secrets set ENCRYPTION_SECRET="ImperialTrade_BrokerEncryption_2025_v1" --token "$SUPABASE_TOKEN"
echo -e "${GREEN}✓${NC} ENCRYPTION_SECRET set"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Secrets Configured Successfully! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Configured Secrets:${NC}"
echo "  ✓ VPS_MT5_SERVICE_URL = http://209.222.12.247:3000"
echo "  ✓ VPS_API_KEY = Imperial_VPS_Secret_2026"
echo "  ✓ ENCRYPTION_SECRET = ImperialTrade_BrokerEncryption_2025_v1"
echo ""
echo -e "${YELLOW}View secrets at:${NC}"
echo "  https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
echo ""
