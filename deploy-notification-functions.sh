#!/bin/bash

# Deploy all notification edge functions
# These functions share the updated notification-core.ts with notes support

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check if SUPABASE_ACCESS_TOKEN is set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ ERROR: SUPABASE_ACCESS_TOKEN not set!"
  echo "Please set it in your .env file or export it:"
  echo "  export SUPABASE_ACCESS_TOKEN=your-token-here"
  echo ""
  echo "Get your token from: https://supabase.com/dashboard/account/tokens"
  exit 1
fi

PROJECT_REF=kmuoqkcxguafxulqlbmi

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

