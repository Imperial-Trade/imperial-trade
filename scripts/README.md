# API Scripts for Claude Code

These scripts allow you to interact with GitHub and Supabase APIs directly from Claude Code, without needing the CLI tools installed.

## Setup

### 1. Get Your Tokens

**GitHub Token:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `workflow`, `admin:org` (as needed)
4. Copy the token

**Supabase Tokens:**
1. Go to https://supabase.com/dashboard/account/tokens
2. Copy your Access Token
3. Go to your project settings to get:
   - Project Reference (from your project URL)
   - Service Role Key (optional, for admin operations)

### 2. Configure Tokens

Edit `.env.tokens` file:

```bash
export GITHUB_TOKEN="ghp_your_token_here"
export SUPABASE_ACCESS_TOKEN="sbp_your_token_here"
export SUPABASE_PROJECT_REF="your_project_ref"
export SUPABASE_SERVICE_KEY="your_service_key" # Optional
```

### 3. Load Tokens

```bash
source .env.tokens
```

## GitHub API Usage

### Create Pull Request
```bash
./scripts/github-api.sh create-pr "feat: Add new feature" "Description of changes"
```

### List Pull Requests
```bash
./scripts/github-api.sh list-prs
```

### Create Issue
```bash
./scripts/github-api.sh create-issue "Bug: Something broke" "Detailed description"
```

### List Issues
```bash
./scripts/github-api.sh list-issues
```

### Repository Info
```bash
./scripts/github-api.sh repo-info
```

### List Workflows
```bash
./scripts/github-api.sh workflows
```

## Supabase API Usage

### Project Information
```bash
./scripts/supabase-api.sh project-info
```

### List All Projects
```bash
./scripts/supabase-api.sh list-projects
```

### Run SQL Migration
```bash
./scripts/supabase-api.sh run-sql migrations/my-migration.sql
```

### List Database Tables
```bash
./scripts/supabase-api.sh list-tables
```

### Check Database Health
```bash
./scripts/supabase-api.sh database-health
```

### List Edge Functions
```bash
./scripts/supabase-api.sh list-functions
```

### Deploy Edge Function
```bash
./scripts/supabase-api.sh deploy-function my-function supabase/functions/my-function/index.ts
```

### Manage Secrets
```bash
# List secrets
./scripts/supabase-api.sh secrets-list

# Set a secret
./scripts/supabase-api.sh secrets-set MY_SECRET "secret_value"
```

## Security Notes

- ⚠️ **Never commit `.env.tokens`** - It's already in `.gitignore`
- 🔐 **Tokens grant full access** - Keep them secure
- 🔄 **Rotate tokens regularly** - Regenerate if compromised
- 👀 **Use minimum required scopes** - Only enable what you need

## Example Workflow

```bash
# 1. Load tokens
source .env.tokens

# 2. Check project status
./scripts/supabase-api.sh project-info
./scripts/github-api.sh repo-info

# 3. Deploy a migration
./scripts/supabase-api.sh run-sql migrations/add-new-table.sql

# 4. Deploy an edge function
./scripts/supabase-api.sh deploy-function notifications supabase/functions/notifications/index.ts

# 5. Create a PR for your changes
git add .
git commit -m "feat: Add notifications"
git push
./scripts/github-api.sh create-pr "feat: Add notifications system" "Implements push notifications"
```

## Troubleshooting

### "GITHUB_TOKEN not set"
- Make sure you've run `source .env.tokens`
- Check that the token is correctly set in `.env.tokens`

### "Authentication failed"
- Verify your token is valid and not expired
- Check token has required scopes/permissions

### "Project not found"
- Verify `SUPABASE_PROJECT_REF` matches your project
- Check you have access to the project

## API Documentation

- **GitHub API**: https://docs.github.com/en/rest
- **Supabase Management API**: https://supabase.com/docs/reference/api
