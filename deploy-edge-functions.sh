#!/bin/bash
# Deploy all critical Edge Functions to Supabase
# Run this script after merging to main

set -e

echo "🚀 Deploying Supabase Edge Functions..."
echo ""

PROJECT_REF="kmuoqkcxguafxulqlbmi"

# Critical notification-related functions
FUNCTIONS=(
  "enhanced-signal-notification-dispatcher"
  "price-monitoring"
  "priority-alert-monitor"
  "signal-notification-dispatcher"
  "order-trigger-monitor"
  "notification-cleanup"
)

echo "📦 Functions to deploy:"
for func in "${FUNCTIONS[@]}"; do
  echo "  - $func"
done
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "📥 Installing Supabase CLI via npm..."
    npm install -g supabase
    echo ""
fi

# Deploy each function
for func in "${FUNCTIONS[@]}"; do
  echo "🔄 Deploying $func..."
  supabase functions deploy "$func" --project-ref "$PROJECT_REF" --no-verify-jwt
  
  if [ $? -eq 0 ]; then
    echo "✅ $func deployed successfully"
  else
    echo "❌ Failed to deploy $func"
    exit 1
  fi
  echo ""
done

echo ""
echo "🎉 All Edge Functions deployed successfully!"
echo ""
echo "⚠️  IMPORTANT: Don't forget to apply the SQL trigger function fix!"
echo "   1. Open Supabase Dashboard > SQL Editor"
echo "   2. Copy contents of APPLY_THIS_TO_SUPABASE.sql"
echo "   3. Paste and RUN in SQL Editor"
echo ""

