#!/bin/bash
# Create watchdog files on VPS via SSH

VPS_IP="45.32.89.134"
VPS_USER="Administrator"
VPS_PASS="2#bWj}tv=}5d}u5}"

# Read watchdog files and create them on VPS
echo "Creating Price Feeder Watchdog on VPS..."

cat << 'EOF' | sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$VPS_USER@$VPS_IP" "powershell -Command \"`$content = [Console]::In.ReadToEnd(); Set-Content -Path 'C:\\imperial-watchdogs\\price-feeder-watchdog.js' -Value `$content -Encoding UTF8\""
$(cat vps-setup/imperial-watchdogs/price-feeder-watchdog.js)
EOF

echo "Creating MT5 Watchdog on VPS..."

cat << 'EOF' | sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$VPS_USER@$VPS_IP" "powershell -Command \"`$content = [Console]::In.ReadToEnd(); Set-Content -Path 'C:\\imperial-watchdogs\\mt5-watchdog.js' -Value `$content -Encoding UTF8\""
$(cat vps-setup/imperial-watchdogs/mt5-watchdog.js)
EOF

echo "Creating package.json on VPS..."

cat << 'EOF' | sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$VPS_USER@$VPS_IP" "powershell -Command \"`$content = [Console]::In.ReadToEnd(); Set-Content -Path 'C:\\imperial-watchdogs\\package.json' -Value `$content -Encoding UTF8\""
$(cat vps-setup/imperial-watchdogs/package.json)
EOF

echo "Done!"



