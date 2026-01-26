#!/bin/bash
# Upload Python files to Ubuntu VPS
# VPS: 209.222.12.247

VPS_HOST="209.222.12.247"
VPS_USER="root"  # Default, update if different
VPS_PATH="/root/vps-broker-service"  # Update if different

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  📤 UPLOADING PYTHON FILES TO VPS"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

# Check if files exist locally
if [ ! -f "vps-broker-service/python/test_connection.py" ]; then
    echo "❌ Error: test_connection.py not found locally"
    exit 1
fi

if [ ! -f "vps-broker-service/python/fetch_trades.py" ]; then
    echo "❌ Error: fetch_trades.py not found locally"
    exit 1
fi

echo "📁 Files to upload:"
echo "   1. test_connection.py"
echo "   2. fetch_trades.py"
echo "   3. mt5_error_handler.py"
echo ""

# Create python directory on VPS if it doesn't exist
echo "📤 Creating python directory on VPS..."
ssh ${VPS_USER}@${VPS_HOST} "mkdir -p ${VPS_PATH}/python"

# Upload files
echo "📤 Uploading test_connection.py..."
scp vps-broker-service/python/test_connection.py ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/python/

echo "📤 Uploading fetch_trades.py..."
scp vps-broker-service/python/fetch_trades.py ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/python/

echo "📤 Uploading mt5_error_handler.py..."
scp vps-broker-service/python/mt5_error_handler.py ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/python/

echo "📤 Uploading get_servers.py..."
scp vps-broker-service/python/get_servers.py ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/python/

# Make files executable
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
echo "   python3 ${VPS_PATH}/python/test_connection.py '{\"login\":\"81071266\",\"password\":\"Imperial@2026\",\"server\":\"ECMarkets-MT5-Live01\"}'"
