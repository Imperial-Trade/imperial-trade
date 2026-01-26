#!/bin/bash
# Test MT5 Docker Container with Broker Credentials
# Account: 800107112
# Server: ECMarkets-MT5-Demo

echo "🧪 Testing MT5 with Broker Credentials"
echo "======================================"
echo "Account: 800107112"
echo "Server: ECMarkets-MT5-Demo"
echo ""

# Step 1: Stop and remove current container
echo "🧹 Cleaning up current container..."
docker stop test-mt5-worker 2>/dev/null
docker rm test-mt5-worker 2>/dev/null

# Step 2: Create config directory
echo "📁 Creating config directory..."
mkdir -p /root/imperial-factory/config

# Step 3: Create launch.ini with broker credentials
echo "📝 Creating launch.ini with broker credentials..."
cat > /root/imperial-factory/config/test_launch.ini << 'EOF'
[Common]
Login=800107112
Password=Demo@123
Server=ECMarkets-MT5-Demo
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

echo "✅ Configuration file created"

# Step 4: Start container
echo "🚀 Starting container with broker credentials..."
CONTAINER_ID=$(docker run -d --name test-mt5-worker \
  -v /root/imperial-factory/config/test_launch.ini:/mt5/config/launch.ini:ro \
  imperial-mt5-worker 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Failed to start container"
    echo "$CONTAINER_ID"
    exit 1
fi

echo "✅ Container started: ${CONTAINER_ID:0:12}"

# Step 5: Wait for initialization
echo "⏳ Waiting 15 seconds for MT5 to initialize..."
sleep 15

# Step 6: Check status
echo ""
echo "📊 Container Status:"
docker ps -a | grep test-mt5-worker

# Step 7: Check MT5 process
echo ""
echo "🔍 MT5 Process:"
docker exec test-mt5-worker ps aux | grep terminal64 2>/dev/null || echo "MT5 process not found yet"

# Step 8: Show logs
echo ""
echo "📋 Container Logs (last 50 lines):"
echo "=================================="
docker logs --tail 50 test-mt5-worker

# Step 9: Check for connection/errors
echo ""
echo "🔍 Connection/Error Messages:"
docker logs test-mt5-worker 2>&1 | grep -i "connected\|login\|authenticate\|error\|fail" | tail -20 || echo "No connection/error messages found"

echo ""
echo "✅ Test complete!"
echo ""
echo "To watch logs in real-time:"
echo "  docker logs -f test-mt5-worker"
echo ""
echo "To check container status:"
echo "  docker ps -a | grep test-mt5-worker"
