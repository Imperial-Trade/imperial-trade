#!/bin/bash
# Manually start containers for testing
# This script creates containers for accounts that have launch.ini files

set -e

echo "🚀 Manually Starting MT5 Containers"
echo "===================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

CONFIG_DIR="/root/imperial-factory/config"
MT5_DIR="/root/imperial-factory/mt5-master"

# Check if launch files exist
LAUNCH_FILES=$(ls ${CONFIG_DIR}/launch_*.ini 2>/dev/null || echo "")

if [ -z "$LAUNCH_FILES" ]; then
    echo -e "${RED}❌ No launch.ini files found${NC}"
    exit 1
fi

echo -e "${GREEN}Found launch files:${NC}"
for file in $LAUNCH_FILES; do
    echo "  - $(basename $file)"
done
echo ""

# Start container for each launch file
for launch_file in $LAUNCH_FILES; do
    CONN_ID=$(basename "$launch_file" | sed 's/launch_\(.*\)\.ini/\1/')
    CONTAINER_NAME="worker_${CONN_ID}"
    
    echo "=========================================="
    echo -e "${YELLOW}Processing: $CONN_ID${NC}"
    echo "Container name: $CONTAINER_NAME"
    
    # Check if container already exists
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
            echo -e "${GREEN}✅ Container already running${NC}"
            continue
        else
            echo -e "${YELLOW}Container exists but stopped, removing...${NC}"
            docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
        fi
    fi
    
    # Check credentials
    LOGIN=$(grep '^Login=' "$launch_file" | cut -d'=' -f2 | head -1 || echo "")
    if [ -z "$LOGIN" ]; then
        echo -e "${RED}❌ Could not read Login from launch file${NC}"
        continue
    fi
    
    # Skip if credentials are encrypted
    if echo "$LOGIN" | grep -q ":"; then
        echo -e "${RED}❌ Credentials are encrypted, skipping${NC}"
        continue
    fi
    
    echo -e "${GREEN}✅ Credentials readable, creating container...${NC}"
    
    # Create and start container
    docker run -d \
        --name "$CONTAINER_NAME" \
        -v "${launch_file}:/mt5/config/launch.ini:ro" \
        -v "${MT5_DIR}:/mt5:ro" \
        --env CONN_ID="$CONN_ID" \
        imperial-mt5-worker:latest
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Container started: $CONTAINER_NAME${NC}"
    else
        echo -e "${RED}❌ Failed to start container: $CONTAINER_NAME${NC}"
    fi
    
    echo ""
    sleep 1
done

echo "=========================================="
echo -e "${GREEN}✅ Done!${NC}"
echo ""
echo "Running containers:"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}' | grep worker || echo "None"
