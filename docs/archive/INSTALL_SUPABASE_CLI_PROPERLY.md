# Install Supabase CLI (Correct Method)

## ❌ Problem: npm Global Install Not Supported

Supabase CLI **cannot** be installed via `npm install -g` anymore. The error message confirms this.

## ✅ Solution: Use Homebrew (Recommended for macOS)

Since you're on macOS and already have Homebrew (we saw `/opt/homebrew/bin/supabase`), use Homebrew:

### Step 1: Install/Update via Homebrew

```bash
brew install supabase/tap/supabase
```

Or if already installed, update it:

```bash
brew upgrade supabase
```

### Step 2: Verify Installation

```bash
supabase --version
```

You should see something like: `supabase version 1.x.x`

### Step 3: Login

```bash
supabase login
```

This will open your browser for authentication.

### Step 4: Navigate to Project

```bash
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
```

### Step 5: Link Project

```bash
supabase link --project-ref kmuoqkcxguafxulqlbmi
```

### Step 6: Deploy Function

```bash
supabase functions deploy test-broker-connection
```

---

## Alternative Installation Methods

### Option A: Direct Download (Manual)

1. Visit: https://github.com/supabase/cli/releases
2. Download the macOS binary
3. Extract and move to `/usr/local/bin/`:
   ```bash
   sudo mv supabase /usr/local/bin/
   chmod +x /usr/local/bin/supabase
   ```

### Option B: Using Deno (If you have Deno)

```bash
deno install --allow-all --name supabase https://github.com/supabase/cli/releases/latest/download/supabase.ts
```

### Option C: Using Scoop (Windows)

Not applicable for macOS, but for reference:
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

---

## Recommended: Use Homebrew

Since you're on macOS and already have Homebrew, this is the easiest:

```bash
brew install supabase/tap/supabase
supabase --version
```

Then proceed with login and deployment!







