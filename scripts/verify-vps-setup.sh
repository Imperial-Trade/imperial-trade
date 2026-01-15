#!/bin/bash
# VPS Setup Verification Script
# Run this on the VPS to verify all installations

set -e

echo "=========================================="
echo "🔍 VPS Setup Verification"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

# Check Docker
echo "Checking Docker..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker installed${NC}"
    docker --version
    if systemctl is-active --quiet docker; then
        echo -e "${GREEN}✅ Docker service is running${NC}"
    else
        echo -e "${RED}❌ Docker service is NOT running${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}❌ Docker not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check Go
echo "Checking Go..."
if command -v go &> /dev/null; then
    echo -e "${GREEN}✅ Go installed${NC}"
    go version
else
    echo -e "${RED}❌ Go not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check Wine
echo "Checking Wine..."
if command -v wine &> /dev/null; then
    echo -e "${GREEN}✅ Wine installed${NC}"
    wine --version
else
    echo -e "${RED}❌ Wine not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check Xvfb
echo "Checking Xvfb..."
if command -v Xvfb &> /dev/null; then
    echo -e "${GREEN}✅ Xvfb installed${NC}"
    Xvfb -help 2>&1 | head -1
else
    echo -e "${RED}❌ Xvfb not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check directories
echo "Checking directory structure..."
REQUIRED_DIRS=(
    "/root/imperial-factory"
    "/root/imperial-factory/mt5-master"
    "/root/imperial-factory/brain"
    "/root/imperial-factory/config"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅ $dir exists${NC}"
    else
        echo -e "${RED}❌ $dir missing${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Summary
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo "VPS is ready for next steps."
    exit 0
else
    echo -e "${RED}❌ Found $ERRORS error(s)${NC}"
    echo "Please fix the errors above before proceeding."
    exit 1
fi
echo "=========================================="
