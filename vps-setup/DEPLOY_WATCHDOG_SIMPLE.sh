#!/bin/bash
# Simple deployment script for Price Feeder Watchdog

VPS_IP="45.32.89.134"
VPS_USER="Administrator"
VPS_PASS="2#bWj}tv=}5d}u5}"

echo "Creating Price Feeder Watchdog file on VPS..."

# Read the watchdog file and create it on VPS using PowerShell
cat << 'WATCHDOG_EOF' | sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$VPS_USER@$VPS_IP" "powershell -Command \"`$content = [Console]::In.ReadToEnd(); New-Item -ItemType Directory -Path C:\\imperial-watchdogs -Force | Out-Null; [System.IO.File]::WriteAllText('C:\\imperial-watchdogs\\price-feeder-watchdog.js', `$content, [System.Text.Encoding]::UTF8); Write-Host 'File created'\""
$(cat vps-setup/imperial-watchdogs/price-feeder-watchdog.js)
WATCHDOG_EOF

echo "Done!"



