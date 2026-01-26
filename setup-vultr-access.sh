#!/bin/bash
# Setup Vultr API Access and VPS Connection

VULTR_API_KEY="${VULTR_API_KEY:-6NF7IFNVFDMMN7KTNP6DDJXJ7DDKD5RWNIPA}"
VULTR_API_URL="https://api.vultr.com/v2"

echo "=== Vultr VPS Access Setup ==="
echo ""

# Check if API key is set
if [ -z "$VULTR_API_KEY" ]; then
    echo "❌ VULTR_API_KEY not set"
    echo "   Set it with: export VULTR_API_KEY='your-key-here'"
    exit 1
fi

echo "✅ API Key configured"
echo ""

# List all instances
echo "📋 Fetching VPS instances..."
INSTANCES=$(curl -s -H "Authorization: Bearer $VULTR_API_KEY" "$VULTR_API_URL/instances" | jq -r '.instances[] | "\(.id) | \(.label) | \(.main_ip) | \(.status)"')

if [ -z "$INSTANCES" ]; then
    echo "❌ No instances found or API error"
    exit 1
fi

echo "Found instances:"
echo "$INSTANCES" | while IFS='|' read -r id label ip status; do
    echo "  - $label ($ip) - Status: $status"
done

echo ""
echo "To connect via RDP:"
echo "  - IP: (use main_ip from above)"
echo "  - Port: 3389"
echo "  - Username: Administrator"
echo ""
echo "To run PowerShell commands remotely, use:"
echo "  pwsh -Command 'Invoke-Command -ComputerName <IP> -Credential <Cred> -ScriptBlock { <command> }'"


