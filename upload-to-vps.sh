#!/bin/bash
# =============================================================================
# Upload Script: EA + Speed Files to VPS
# =============================================================================

VPS_HOST="root@209.222.12.247"
VPS_PATH="/root/imperial-factory"

echo "═══════════════════════════════════════════════════════════════"
echo "     UPLOAD TO VPS SCRIPT"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if files exist on Desktop
DESKTOP="$HOME/Desktop"

# 1. Upload compiled EA
if [ -f "$DESKTOP/ImperialSync.ex5" ]; then
    echo "📤 Uploading compiled EA..."
    scp "$DESKTOP/ImperialSync.ex5" "$VPS_HOST:$VPS_PATH/mt5-master/MQL5/Experts/"
    if [ $? -eq 0 ]; then
        echo "✅ EA uploaded successfully"
    else
        echo "❌ EA upload failed"
    fi
else
    echo "⚠️  ImperialSync.ex5 not found on Desktop"
    echo "   Please compile the EA and place it on Desktop first"
fi

echo ""

# 2. Upload EC Markets speed file
if [ -f "$DESKTOP/ec-servers.dat" ]; then
    echo "📤 Uploading EC Markets speed file..."
    scp "$DESKTOP/ec-servers.dat" "$VPS_HOST:$VPS_PATH/broker-configs/ec/servers.dat"
    if [ $? -eq 0 ]; then
        echo "✅ EC Markets speed file uploaded successfully"
    else
        echo "❌ EC Markets upload failed"
    fi
else
    echo "⚠️  ec-servers.dat not found on Desktop"
    echo "   Please extract from EC Markets MT5 and place on Desktop"
fi

echo ""

# 3. Upload XS.com speed file
if [ -f "$DESKTOP/xs-servers.dat" ]; then
    echo "📤 Uploading XS.com speed file..."
    scp "$DESKTOP/xs-servers.dat" "$VPS_HOST:$VPS_PATH/broker-configs/xs/servers.dat"
    if [ $? -eq 0 ]; then
        echo "✅ XS.com speed file uploaded successfully"
    else
        echo "❌ XS.com upload failed"
    fi
else
    echo "⚠️  xs-servers.dat not found on Desktop"
    echo "   Please extract from XS.com MT5 and place on Desktop"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"

# 4. Rebuild Docker image and restart
read -p "Rebuild Docker image and restart Go Brain? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔨 Rebuilding Docker image..."
    ssh "$VPS_HOST" "cd $VPS_PATH/mt5-master && docker build -t imperial-mt5-worker:latest . && systemctl restart imperial-brain"
    echo "✅ Docker image rebuilt and Go Brain restarted"
fi

echo ""
echo "✅ Upload complete!"
echo ""
echo "Next steps:"
echo "  1. Test a connection from the frontend"
echo "  2. Check logs: ssh $VPS_HOST 'journalctl -u imperial-brain -f'"
echo ""
