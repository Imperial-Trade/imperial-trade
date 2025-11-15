#!/bin/bash

# Deploy all notification edge functions
# These functions share the updated notification-core.ts with notes support

export SUPABASE_ACCESS_TOKEN=sbp_b7a054723ccb57908638330e0ea71550d92febc6
PROJECT_REF=akuddkuqqevbnjpaqnwl

echo "🚀 Deploying Notification Edge Functions with Notes Support..."
echo ""

functions=(
  "notify-signal-created"
  "notify-tp-hit"
  "notify-stop-loss-hit"
  "notify-signal-closed"
  "notify-limit-activated"
  "notify-notes-updated"
)

for func in "${functions[@]}"; do
  echo "📦 Deploying $func..."
  npx supabase functions deploy "$func" --project-ref "$PROJECT_REF" --no-verify-jwt
  
  if [ $? -eq 0 ]; then
    echo "✅ $func deployed successfully"
  else
    echo "❌ Failed to deploy $func"
  fi
  echo ""
done

echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Create a test signal with notes"
echo "2. Check Recent Activity panel"
echo "3. Verify notes appear below main message"

