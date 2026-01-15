#!/bin/bash
# Manual Installation Script for Windows Python in Wine
# Run this ON THE VPS after SSH'ing in

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  📦 INSTALLING WINDOWS PYTHON IN WINE"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

cd /tmp

# Download Python if not exists
if [ ! -f "python-3.10.11-amd64.exe" ]; then
    echo "📥 Downloading Python 3.10.11 for Windows..."
    wget https://www.python.org/ftp/python/3.10.11/python-3.10.11-amd64.exe
fi

echo "🚀 Installing Python (this will show a GUI installer)..."
echo "   Please follow the installer prompts:"
echo "   1. Check 'Add Python to PATH'"
echo "   2. Click 'Install Now'"
echo "   3. Wait for installation to complete"
echo ""

# Run the installer (GUI will appear)
wine python-3.10.11-amd64.exe

echo ""
echo "⏳ Waiting 10 seconds for installation to complete..."
sleep 10

echo ""
echo "🔍 Checking if Python was installed..."
find ~/.wine/drive_c -name "python.exe" 2>/dev/null | head -3

echo ""
echo "📦 Installing MetaTrader5 library..."
# Try common Python paths
for PYTHON_PATH in \
    "C:\\Python310\\python.exe" \
    "C:\\Program Files\\Python310\\python.exe" \
    "C:\\Program Files (x86)\\Python310\\python.exe"
do
    if wine "$PYTHON_PATH" --version >/dev/null 2>&1; then
        echo "✅ Found Python at: $PYTHON_PATH"
        echo "Installing MetaTrader5..."
        wine "$PYTHON_PATH" -m pip install --upgrade pip
        wine "$PYTHON_PATH" -m pip install MetaTrader5
        echo ""
        echo "✅ Verifying installation..."
        wine "$PYTHON_PATH" -c "import MetaTrader5; print('SUCCESS: MetaTrader5 version', MetaTrader5.__version__)"
        exit 0
    fi
done

echo "❌ Python installation not found. Please check the installation manually."
echo ""
echo "To find Python manually, run:"
echo "  find ~/.wine/drive_c -name 'python.exe'"
