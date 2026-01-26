#!/bin/bash
# Diagnostic Commands for MT5 Connection Issue on VPS

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  🔍 MT5 CONNECTION DIAGNOSTIC"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Check if MT5 Terminal Files Exist"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check common locations
echo "Checking common MT5 locations:"
for path in \
  "/root/MT5_BrokerService/terminal64.exe" \
  "/root/.wine/drive_c/MT5_BrokerService/terminal64.exe" \
  "~/MT5_BrokerService/terminal64.exe" \
  "~/.wine/drive_c/MT5_BrokerService/terminal64.exe"
do
  if [ -f "$path" ]; then
    echo "✅ FOUND: $path"
  else
    echo "❌ NOT FOUND: $path"
  fi
done

echo ""
echo "Searching for terminal64.exe:"
find /root /home -name "terminal64.exe" 2>/dev/null | head -5

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Check if MT5 Process is Running"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ps aux | grep -i terminal64 | grep -v grep; then
  echo "✅ MT5 terminal process is running"
else
  echo "❌ MT5 terminal process is NOT running"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Check Wine Installation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v wine &> /dev/null; then
  echo "✅ Wine is installed: $(wine --version)"
else
  echo "❌ Wine is NOT installed"
fi

echo ""
echo "Wine prefix: ${WINEPREFIX:-~/.wine (default)}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Check Python MetaTrader5 Library"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if python3 -c "import MetaTrader5" 2>/dev/null; then
  echo "✅ MetaTrader5 library is installed"
  python3 -c "import MetaTrader5 as mt5; print(f'Version: {mt5.__version__}')" 2>/dev/null || echo "Version check failed"
else
  echo "❌ MetaTrader5 library is NOT installed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Check Broker Service Directory"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "python/test_connection.py" ]; then
  echo "✅ test_connection.py found in current directory"
else
  echo "❌ test_connection.py NOT found in current directory"
  echo "   Searching for it..."
  find /root /home -name "test_connection.py" 2>/dev/null | head -3
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run this script to diagnose the MT5 connection issue."
echo "The most common issue is: MT5 terminal not running or wrong path."
