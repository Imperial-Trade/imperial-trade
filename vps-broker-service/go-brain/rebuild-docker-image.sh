#!/bin/bash
# Rebuild Docker image with Wine 11.0
# This script ensures the imperial-mt5-worker image uses the latest Wine 11.0

set -e

echo "🍷 Rebuilding Docker Image with Wine 11.0"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if we're in the right directory
if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}❌ Error: Dockerfile not found${NC}"
    echo "Please run this script from the directory containing Dockerfile"
    exit 1
fi

# Check if entrypoint.sh exists
if [ ! -f "entrypoint.sh" ]; then
    echo -e "${RED}❌ Error: entrypoint.sh not found${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 1: Building Docker image...${NC}"
echo "Image name: imperial-mt5-worker:latest"
echo "Wine version: 11.0 (latest stable)"
echo ""

# Build the Docker image
docker build -t imperial-mt5-worker:latest .

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Docker image built successfully!${NC}"
    echo ""
    
    # Verify Wine version in the image
    echo -e "${YELLOW}Step 2: Verifying Wine version...${NC}"
    WINE_VERSION=$(docker run --rm imperial-mt5-worker:latest wine --version 2>&1)
    echo "Wine version: $WINE_VERSION"
    
    if echo "$WINE_VERSION" | grep -q "wine-11"; then
        echo -e "${GREEN}✅ Wine 11.0 confirmed!${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: Wine version may not be 11.0${NC}"
        echo "Version detected: $WINE_VERSION"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Image ready: imperial-mt5-worker:latest${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Stop existing containers (if any):"
    echo "     docker stop \$(docker ps -q --filter 'name=worker_')"
    echo ""
    echo "  2. Restart Go Brain service to use new image:"
    echo "     systemctl restart imperial-brain"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
fi
