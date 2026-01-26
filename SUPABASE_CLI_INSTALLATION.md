# Supabase CLI Installation Guide

## Installation Location: **Global (System-wide)**

Install Supabase CLI **globally** using npm, which makes it available from any directory in your terminal.

## Prerequisites

First, check if you have Node.js and npm installed:

```bash
node --version
npm --version
```

If these commands don't work, install Node.js first:
- **macOS/Linux**: https://nodejs.org/
- Or use Homebrew: `brew install node`

## Installation Steps

### Step 1: Install Supabase CLI Globally

Run this command in your terminal (from any directory):

```bash
npm install -g supabase
```

**What this does:**
- Installs the `supabase` command globally
- Makes it available from anywhere in your terminal
- Typically installs to: `/usr/local/bin/supabase` (macOS/Linux) or `C:\Users\YourName\AppData\Roaming\npm\supabase` (Windows)

### Step 2: Verify Installation

```bash
supabase --version
```

You should see something like: `supabase version x.x.x`

### Step 3: Login to Supabase

```bash
supabase login
```

This will:
- Open your browser
- Ask you to authenticate with Supabase
- Save your credentials locally

### Step 4: Navigate to Your Project

```bash
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
```

### Step 5: Link Your Project

```bash
supabase link --project-ref kmuoqkcxguafxulqlbmi
```

### Step 6: Deploy the Function

```bash
supabase functions deploy test-broker-connection
```

Or with debug mode for more info:

```bash
supabase functions deploy test-broker-connection --debug
```

## Alternative Installation Methods

### Option A: Using Homebrew (macOS)

If you prefer Homebrew:

```bash
brew install supabase/tap/supabase
```

### Option B: Using Deno

```bash
deno install --allow-all --name supabase https://github.com/supabase/cli/releases/latest/download/supabase.ts
```

### Option C: Manual Download

Download from: https://github.com/supabase/cli/releases

## Troubleshooting

### If `npm install -g` fails:

1. **Permission issues**: Use `sudo` on macOS/Linux:
   ```bash
   sudo npm install -g supabase
   ```

2. **Or configure npm to use a different directory** (better for macOS):
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
   source ~/.zshrc
   npm install -g supabase
   ```

### Verify PATH

Make sure the installation directory is in your PATH:

```bash
echo $PATH
which supabase
```

## Quick Start Commands Summary

Once installed, run these in order:

```bash
# 1. Login (opens browser)
supabase login

# 2. Go to project directory
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"

# 3. Link project
supabase link --project-ref kmuoqkcxguafxulqlbmi

# 4. Deploy function
supabase functions deploy test-broker-connection
```

## Need Help?

- Supabase CLI Docs: https://supabase.com/docs/reference/cli
- GitHub: https://github.com/supabase/cli







