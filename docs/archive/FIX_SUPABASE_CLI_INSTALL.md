# Fix Supabase CLI Installation

## Issue: Supabase CLI Already Exists

The error shows Supabase CLI is already installed at `/opt/homebrew/bin/supabase` (likely via Homebrew).

## Solution Options:

### Option 1: Use --force to Overwrite (Quick Fix)

Run this command to force install over the existing version:

```bash
npm install -g supabase --force
```

### Option 2: Check if Existing Version Works

First, verify if the existing CLI works:

```bash
supabase --version
```

If it shows a version number, you can use it as-is! Just proceed to login and deploy.

### Option 3: Remove and Reinstall

If you want a clean install:

```bash
# Remove the existing one
rm /opt/homebrew/bin/supabase

# Then install fresh
npm install -g supabase
```

Or if installed via Homebrew:

```bash
# Uninstall via Homebrew
brew uninstall supabase

# Then install via npm
npm install -g supabase
```

## Recommended: Try Option 1 (--force)

Since it's the quickest, try this first:

```bash
npm install -g supabase --force
```

Then verify:

```bash
supabase --version
```

## After Installation Works:

1. **Login:**
   ```bash
   supabase login
   ```

2. **Navigate to project:**
   ```bash
   cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
   ```

3. **Link project:**
   ```bash
   supabase link --project-ref kmuoqkcxguafxulqlbmi
   ```

4. **Deploy:**
   ```bash
   supabase functions deploy test-broker-connection
   ```







