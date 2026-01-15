#!/bin/bash
# Docker Entrypoint for MT5 Worker Container
# Handles virtual display and launches MT5 in portable mode with auto-login

# 1. Start the Virtual Display (Xvfb)
# MT5 needs a "screen" to start, even if we don't see it
Xvfb :99 -screen 0 1024x768x16 &
export DISPLAY=:99

# 2. Wait a moment for Xvfb to initialize
sleep 2

# 3. Launch MT5 in Portable Mode
# /portable: Keeps all files in the MT5 folder (important for Docker)
# /config: Points to the login credentials and EA settings
echo "🚀 Imperial Factory: Launching MT5 Worker Headless..."
wine /mt5/terminal64.exe /portable /config:/mt5/config/launch.ini
