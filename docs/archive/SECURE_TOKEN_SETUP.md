# 🔐 Secure Token Setup Guide

This guide helps you securely configure your GitHub and Supabase tokens.

## ⚠️ Security Warning

**NEVER commit tokens or credentials to Git!**

The `.git-credentials` file has been added to `.gitignore` to prevent accidental commits.

## 📝 Setup Steps

### 1. Create Your `.env` File

Copy the example file:

```bash
cp .env.example .env
```

### 2. Configure Your Tokens

Edit `.env` and add your actual tokens:

```bash
# Supabase Configuration (already retrieved)
VITE_SUPABASE_URL=https://kmuoqkcxguafxulqlbmi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MDI5NjYsImV4cCI6MjA3MzE3ODk2Nn0.m6vaoaT7X7VvcKaY3W3aVEi5ZjqitAjQAJbyYnps_sc

# Supabase Access Token (for deployment scripts)
SUPABASE_ACCESS_TOKEN=sbp_b7a054723ccb57908638330e0ea71550d92febc6

# GitHub Personal Access Token (optional)
GITHUB_TOKEN=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
```

### 3. For PowerShell (Windows)

If using PowerShell, you can also set environment variables in your session:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_b7a054723ccb57908638330e0ea71550d92febc6"
$env:GITHUB_TOKEN = "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"
```

Or add to your PowerShell profile (persistent):

```powershell
# Edit your profile
notepad $PROFILE

# Add these lines:
$env:SUPABASE_ACCESS_TOKEN = "sbp_b7a054723ccb57908638330e0ea71550d92febc6"
$env:GITHUB_TOKEN = "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"
```

### 4. For Bash (Linux/Mac/Git Bash)

Set environment variables in your shell:

```bash
export SUPABASE_ACCESS_TOKEN=sbp_b7a054723ccb57908638330e0ea71550d92febc6
export GITHUB_TOKEN=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
```

Or add to `~/.bashrc` or `~/.zshrc` (persistent):

```bash
echo 'export SUPABASE_ACCESS_TOKEN=sbp_b7a054723ccb57908638330e0ea71550d92febc6' >> ~/.bashrc
echo 'export GITHUB_TOKEN=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' >> ~/.bashrc
```

## ✅ Verification

### Check if tokens are set:

**PowerShell:**
```powershell
echo $env:SUPABASE_ACCESS_TOKEN
echo $env:GITHUB_TOKEN
```

**Bash:**
```bash
echo $SUPABASE_ACCESS_TOKEN
echo $GITHUB_TOKEN
```

### Test Supabase Access:

```bash
supabase projects list
```

### Test GitHub Access:

```bash
git config --global credential.helper store
```

## 🚀 Using Deployment Scripts

The deployment scripts now automatically load environment variables from `.env`:

```bash
# Bash
./deploy-notification-functions.sh

# PowerShell
.\deploy-notification-functions.ps1
```

## 🔒 Security Best Practices

1. ✅ **DO**: Store tokens in `.env` (already in `.gitignore`)
2. ✅ **DO**: Use `.env.example` as a template (no real tokens)
3. ✅ **DO**: Rotate tokens regularly
4. ❌ **DON'T**: Commit `.env` or `.git-credentials` to Git
5. ❌ **DON'T**: Share tokens in screenshots or public channels
6. ❌ **DON'T**: Hardcode tokens in source code

## 📍 Token Locations

- **Supabase Access Token**: https://supabase.com/dashboard/account/tokens
- **GitHub Personal Access Token**: https://github.com/settings/tokens
- **Supabase Project URL & Anon Key**: Available via Supabase MCP tools (already retrieved)

## 🔄 If Tokens Are Compromised

1. Immediately revoke the token
2. Generate a new token
3. Update all places where the old token was used
4. Review access logs for unauthorized activity


