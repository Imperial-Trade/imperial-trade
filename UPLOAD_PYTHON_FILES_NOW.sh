#!/bin/bash
# Upload Python files to VPS - Interactive version
# VPS: 209.222.12.247

VPS_HOST="209.222.12.247"
VPS_USER="root"
VPS_PATH="/root/vps-broker-service"

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  📤 UPLOADING PYTHON FILES TO VPS"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

# Check if files exist locally
if [ ! -f "vps-broker-service/python/test_connection.py" ]; then
    echo "❌ Error: test_connection.py not found locally"
    exit 1
fi

echo "📁 Files to upload:"
echo "   1. test_connection.py (✅ Fixed - uses /root/imperial-factory/mt5-master/terminal64.exe)"
echo "   2. fetch_trades.py (✅ Fixed - uses /root/imperial-factory/mt5-master/terminal64.exe)"
echo "   3. mt5_error_handler.py (Required dependency)"
echo "   4. get_servers.py (✅ Fixed - uses /root/imperial-factory/mt5-master/terminal64.exe)"
echo ""

# Create python directory on VPS if it doesn't exist
echo "📤 Creating python directory on VPS..."
ssh ${VPS_USER}@${VPS_HOST} "mkdir -p ${VPS_PATH}/python" || {
    echo "❌ Failed to create directory. Please check SSH access."
    exit 1
}

# Upload files
echo ""
echo "📤 Uploading test_connection.py..."
scp vps-broker-service/python/test_connection.py ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/python/ || {
    echo "❌ Failed to upload test_connection.py"
    exit 1
}

echo "📤 Uploading fetch_trades.py..."
scp vps-broker-service/python/fetch_trades.py ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/python/ || {
    echo "❌ Failed to upload fetch_trades.py"
    exit 1
}

echo "📤 Uploading mt5_error_handler.py..."
scp vps-broker-service/python/mt5_error_handler.py ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/python/ || {
    echo "❌ Failed to upload mt5_error_handler.py"
    exit 1
}

echo "📤 Uploading get_servers.py..."
scp vps-broker-service/python/get_servers.py ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/python/ || {
    echo "❌ Failed to upload get_servers.py"
    exit 1
}

# Make files executable
echo ""
echo "🔧 Making files executable..."
ssh ${VPS_USER}@${VPS_HOST} "chmod +x ${VPS_PATH}/python/*.py"

# Verify upload
echo ""
echo "✅ Verifying upload..."
ssh ${VPS_USER}@${VPS_HOST} "ls -la ${VPS_PATH}/python/test_connection.py ${VPS_PATH}/python/fetch_trades.py"

echo ""
echo "✅ Upload complete!"
echo ""
echo "📝 Next: Test the connection on VPS:"
echo "   ssh ${VPS_USER}@${VPS_HOST}"
echo "   cd ${VPS_PATH}"
echo "   python3 python/test_connection.py '{\"login\":\"81071266\",\"password\":\"Imperial@2026\",\"server\":\"ECMarkets-MT5-Live01\"}'"
