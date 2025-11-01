#!/bin/bash
# Script to fix package-lock.json sync issues in all repositories

echo "🔧 Fixing Academy Repository..."
cd /home/user/academy 2>/dev/null || {
    echo "⚠️  Academy repo not found. Cloning..."
    cd /home/user
    git clone https://github.com/Imperial-Trade/academy.git
    cd academy
}

# Checkout production branch
git fetch origin production
git checkout production

# Regenerate package-lock.json
echo "📦 Regenerating package-lock.json..."
npm install

# Commit and push
git add package-lock.json
git commit -m "Fix: Regenerate package-lock.json to match package.json"
git push origin production

echo "✅ Academy fixed!"

echo ""
echo "🔧 Fixing Orderflow Repository..."
cd /home/user/orderflow 2>/dev/null || {
    echo "⚠️  Orderflow repo not found. Cloning..."
    cd /home/user
    git clone https://github.com/Imperial-Trade/orderflow.git
    cd orderflow
}

# Checkout production branch
git fetch origin production
git checkout production

# Regenerate package-lock.json
echo "📦 Regenerating package-lock.json..."
npm install

# Commit and push
git add package-lock.json
git commit -m "Fix: Regenerate package-lock.json to match package.json"
git push origin production

echo "✅ Orderflow fixed!"
echo ""
echo "🎉 All repositories fixed!"
