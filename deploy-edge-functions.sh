#!/bin/bash
# Bash script to deploy all notification edge functions
# Run this from the imperial-trade directory

echo "🚀 Deploying All Notification Edge Functions..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "Please install it first: https://supabase.com/docs/guides/cli"
    echo ""
    echo "Quick install:"
    echo "  npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Array of functions to deploy
functions=(
    "notify-signal-created"
    "notify-tp-hit"
    "notify-stop-loss-hit"
    "notify-signal-closed"
    "notify-limit-activated"
    "notify-notes-updated"
)

deployed=0
failed=0

for func in "${functions[@]}"; do
    echo "📤 Deploying: $func..."
    
    if supabase functions deploy "$func"; then
        echo "✅ $func deployed successfully!"
        ((deployed++))
    else
        echo "❌ $func deployment failed"
        ((failed++))
    fi
    
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 DEPLOYMENT SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployed: $deployed / ${#functions[@]}"
if [ $failed -gt 0 ]; then
    echo "❌ Failed: $failed"
fi
echo ""

if [ $deployed -eq ${#functions[@]} ]; then
    echo "🎉 ALL FUNCTIONS DEPLOYED SUCCESSFULLY!"
    echo ""
    echo "Next steps:"
    echo "  1. Clear your browser localStorage"
    echo "  2. Log out and log back in"
    echo "  3. Airbnb modal should appear after 2 seconds"
    echo "  4. Click 'Yes, notify me'"
    echo "  5. Create a test trade alert"
    echo "  6. Receive push notification! 🎉"
else
    echo "⚠️ Some functions failed to deploy. Please check the errors above."
fi

echo ""
