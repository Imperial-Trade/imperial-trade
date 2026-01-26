#!/bin/bash
# VPS MT5 Diagnostic Script
# Run this on VPS to check if MT5 setup is correct

echo "=========================================="
echo "VPS MT5 Diagnostic Check"
echo "=========================================="
echo ""

echo "1. Checking Docker Service..."
if systemctl is-active --quiet docker; then
    echo "✅ Docker is running"
else
    echo "❌ Docker is NOT running"
fi
echo ""

echo "2. Checking Docker Images..."
docker images | grep -i "imperial-mt5-worker" && echo "✅ imperial-mt5-worker image found" || echo "❌ imperial-mt5-worker image NOT found"
echo ""

echo "3. Checking Go Brain Service..."
if systemctl is-active --quiet imperial-brain; then
    echo "✅ Go Brain service is running"
    systemctl status imperial-brain --no-pager -l | head -10
else
    echo "❌ Go Brain service is NOT running"
fi
echo ""

echo "4. Checking MT5 Files..."
if [ -f "/root/imperial-factory/mt5-master/terminal64.exe" ]; then
    echo "✅ MT5 found: /root/imperial-factory/mt5-master/terminal64.exe"
elif [ -f "/root/.wine/drive_c/imperial-factory/mt5-master/terminal64.exe" ]; then
    echo "✅ MT5 found: /root/.wine/drive_c/imperial-factory/mt5-master/terminal64.exe"
elif [ -f "/root/.wine/drive_c/Program Files/MetaTrader 5/terminal64.exe" ]; then
    echo "✅ MT5 found: /root/.wine/drive_c/Program Files/MetaTrader 5/terminal64.exe"
else
    echo "❌ MT5 terminal64.exe NOT found in common locations"
fi
echo ""

echo "5. Checking Running Containers..."
RUNNING=$(docker ps | grep -c worker || echo "0")
if [ "$RUNNING" -gt 0 ]; then
    echo "✅ $RUNNING worker container(s) running"
    docker ps | grep worker
else
    echo "ℹ️  No worker containers currently running"
fi
echo ""

echo "6. Checking All Containers (including stopped)..."
ALL_CONTAINERS=$(docker ps -a | grep -c worker || echo "0")
if [ "$ALL_CONTAINERS" -gt 0 ]; then
    echo "ℹ️  Found $ALL_CONTAINERS worker container(s) (including stopped)"
    docker ps -a | grep worker | head -5
else
    echo "ℹ️  No worker containers found"
fi
echo ""

echo "7. Checking Go Brain Logs (last 20 lines)..."
journalctl -u imperial-brain --no-pager -n 20 --no-hostname
echo ""

echo "=========================================="
echo "Diagnostic Complete"
echo "=========================================="
