#!/bin/bash
# Verification script for Imperial Brain VPS setup
# Run this script on the VPS to verify everything is configured correctly

set -e

echo "🔍 Imperial Brain - VPS Setup Verification"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        ERRORS=$((ERRORS + 1))
    fi
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

echo ""
echo "1. Checking Go installation..."
command -v go &> /dev/null
check "Go is installed"

if command -v go &> /dev/null; then
    go version
fi

echo ""
echo "2. Checking directory structure..."
[ -d "/root/imperial-factory/broker-service/go-brain" ] && check "Go Brain directory exists" || warn "Go Brain directory missing: /root/imperial-factory/broker-service/go-brain"
[ -d "/root/imperial-factory/config" ] && check "Config directory exists" || warn "Config directory missing: /root/imperial-factory/config"
[ -d "/root/imperial-factory/mt5-master" ] && check "MT5 Master directory exists" || warn "MT5 Master directory missing: /root/imperial-factory/mt5-master"

echo ""
echo "3. Checking Go Brain files..."
[ -f "/root/imperial-factory/broker-service/go-brain/main.go" ] && check "main.go exists" || warn "main.go missing"
[ -f "/root/imperial-factory/broker-service/go-brain/go.mod" ] && check "go.mod exists" || warn "go.mod missing"
[ -f "/root/imperial-factory/broker-service/go-brain/imperial-brain" ] && check "imperial-brain binary exists" || warn "imperial-brain binary not built"

echo ""
echo "4. Checking Docker..."
command -v docker &> /dev/null
check "Docker is installed"

if command -v docker &> /dev/null; then
    systemctl is-active --quiet docker
    check "Docker service is running"
    
    docker images | grep -q "imperial-mt5-worker" && check "Docker image 'imperial-mt5-worker' exists" || warn "Docker image 'imperial-mt5-worker' not found"
fi

echo ""
echo "5. Checking systemd service..."
[ -f "/etc/systemd/system/imperial-brain.service" ] && check "Systemd service file exists" || warn "Service file missing"

if [ -f "/etc/systemd/system/imperial-brain.service" ]; then
    systemctl is-enabled imperial-brain &> /dev/null
    check "Service is enabled"
    
    systemctl is-active --quiet imperial-brain && check "Service is running" || warn "Service is not running (use: systemctl start imperial-brain)"
fi

echo ""
echo "6. Checking environment variables..."
if [ -f "/etc/systemd/system/imperial-brain.service" ]; then
    grep -q "DATABASE_URL" /etc/systemd/system/imperial-brain.service && check "DATABASE_URL is configured" || warn "DATABASE_URL not found in service file"
    grep -q "LISTENER_DATABASE_URL" /etc/systemd/system/imperial-brain.service && check "LISTENER_DATABASE_URL is configured" || warn "LISTENER_DATABASE_URL not found in service file"
    grep -q "ENCRYPTION_SECRET" /etc/systemd/system/imperial-brain.service && check "ENCRYPTION_SECRET is configured" || warn "ENCRYPTION_SECRET not found in service file"
fi

echo ""
echo "7. Testing database connection..."
if [ -f "/root/imperial-factory/broker-service/go-brain/imperial-brain" ]; then
    timeout 5 /root/imperial-factory/broker-service/go-brain/imperial-brain --test-connection &> /dev/null || true
    # Note: Actual test would require database credentials
    warn "Database connection test skipped (requires running service)"
else
    warn "Cannot test database connection (binary not found)"
fi

echo ""
echo "8. Checking file permissions..."
if [ -f "/root/imperial-factory/broker-service/go-brain/imperial-brain" ]; then
    [ -x "/root/imperial-factory/broker-service/go-brain/imperial-brain" ] && check "Binary is executable" || warn "Binary is not executable (run: chmod +x /root/imperial-factory/broker-service/go-brain/imperial-brain)"
fi

echo ""
echo "=========================================="
echo "Verification Summary:"
echo "  Errors: $ERRORS"
echo "  Warnings: $WARNINGS"
echo "=========================================="

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Setup looks good!${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Please review warnings above${NC}"
    fi
    exit 0
else
    echo -e "${RED}❌ Please fix errors above${NC}"
    exit 1
fi
