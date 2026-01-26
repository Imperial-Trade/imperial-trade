#!/bin/bash
# Quick MT5 Docker Test Script
# Usage: ./test-mt5-docker.sh <LOGIN> <PASSWORD> <SERVER>

if [ $# -ne 3 ]; then
    echo "Usage: $0 <LOGIN> <PASSWORD> <SERVER>"
    echo "Example: $0 800107112 Demo@123 ECMarkets-MT5-Demo"
    exit 1
fi

LOGIN=$1
PASSWORD=$2
SERVER=$3

echo "🧪 Testing MT5 in Docker Container"
echo "=================================="
echo "Login: $LOGIN"
echo "Server: $SERVER"
echo ""

# Create config directory
mkdir -p /root/imperial-factory/config

# Create launch.ini
cat > /root/imperial-factory/config/test_launch.ini << EOF
[Common]
Login=${LOGIN}
Password=${PASSWORD}
Server=${SERVER}
ProxyEnable=0
CertConfirm=1

[Experts]
AllowLiveTrading=1
AllowDllImport=0
Enabled=1
AccountAndConsole=1
WebRequestEnable=1
WebRequestUrl=https://kmuoqkcxguafxulqlbmi.supabase.co

[Chart1]
Symbol=EURUSD
Period=M1
Expert=ImperialSync
EOF

echo "✅ Created launch.ini file"

# Clean up old test container
echo "🧹 Cleaning up old test container..."
docker stop test-mt5-worker 2>/dev/null
docker rm test-mt5-worker 2>/dev/null

# Check if image exists
if ! docker images | grep -q imperial-mt5-worker; then
    echo "❌ ERROR: imperial-mt5-worker image not found!"
    echo "   Please build the image first or check if it exists."
    exit 1
fi

# Run container
echo "🚀 Starting test container..."
CONTAINER_ID=$(docker run -d --name test-mt5-worker \
  -v /root/imperial-factory/config/test_launch.ini:/mt5/config/launch.ini:ro \
  imperial-mt5-worker 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Failed to start container"
    echo "$CONTAINER_ID"
    exit 1
fi

echo "✅ Container started: ${CONTAINER_ID:0:12}"

# Wait a bit for MT5 to start
echo "⏳ Waiting 10 seconds for MT5 to initialize..."
sleep 10

# Show logs
echo ""
echo "📋 Container logs (last 50 lines):"
echo "=================================="
docker logs --tail 50 test-mt5-worker

# Check status
echo ""
echo "📊 Container status:"
docker ps -a | grep test-mt5-worker

# Check if container is still running
if docker ps | grep -q test-mt5-worker; then
    echo ""
    echo "✅ Container is running!"
    echo ""
    echo "To watch logs in real-time:"
    echo "  docker logs -f test-mt5-worker"
    echo ""
    echo "To stop and remove container:"
    echo "  docker stop test-mt5-worker && docker rm test-mt5-worker"
else
    echo ""
    echo "⚠️  Container exited. Check logs above for errors."
fi
