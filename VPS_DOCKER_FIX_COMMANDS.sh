#!/bin/bash
# Commands to Update Dockerfile and Rebuild Image on VPS
# Copy and paste these commands into your VPS terminal

echo "🚀 Starting Docker Fix Deployment..."

# Step 1: Navigate to Docker directory
cd /root/imperial-factory/mt5-master

# Step 2: Create/Update Dockerfile with Wine fixes
cat > Dockerfile << 'EOF'
# Dockerfile for Imperial MT5 Worker
# Optimized Dockerfile for Headless MT5 with Wine fixes

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install Wine and Xvfb
RUN dpkg --add-architecture i386 && apt-get update && \
    apt-get install -y wine64 wine32:i386 xvfb wget && apt-get clean

WORKDIR /mt5
COPY . /mt5

# entrypoint.sh logic with fixes for OLE/COM and Toolbar errors
RUN echo '#!/bin/bash\n\
Xvfb :99 -screen 0 1024x768x16 &\n\
export DISPLAY=:99\n\
# SILENCE THE ERRORS: This stops the Toolbar spam\n\
export WINEDEBUG=-all\n\
# Initialize Wine if not already done\n\
if [ ! -d "/root/.wine" ]; then\n\
    wineboot --init\n\
    sleep 5\n\
fi\n\
echo "🚀 Launching MT5 Worker Headless..."\n\
wine /mt5/terminal64.exe /portable /config:/mt5/config/launch.ini' > /mt5/entrypoint.sh

RUN chmod +x /mt5/entrypoint.sh
ENTRYPOINT ["/mt5/entrypoint.sh"]
EOF

echo "✅ Dockerfile updated"

# Step 3: Rebuild Docker image with fixes
echo "🔨 Rebuilding Docker image (this may take a few minutes)..."
docker build -t imperial-mt5-worker .

echo "✅ Docker image rebuilt successfully!"

# Step 4: Verify image exists
echo ""
echo "📋 Verifying image..."
docker images | grep imperial-mt5-worker

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps (optional testing):"
echo "1. Clean up old test container: docker rm -f test-mt5-worker"
echo "2. Run test container: docker run -d --name test-mt5-worker -v /root/imperial-factory/config/test_launch.ini:/mt5/config/launch.ini:ro imperial-mt5-worker"
echo "3. Check logs: docker logs test-mt5-worker"
echo "4. Check for errors: docker logs test-mt5-worker 2>&1 | grep -i 'error\\|warn\\|fail' | head -20"
