# Apply Insight XX History Migration

## Issue
Analyses are not appearing in the history page because the database table doesn't exist yet.

## Solution
You need to run the migration to create the `insight_xx_analyses` table.

## Steps to Apply Migration

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open a new query
4. Copy the entire contents of `supabase/migrations/20260125_create_insight_xx_analyses.sql`
5. Paste it into the SQL Editor
6. Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
7. Verify success - you should see "Success. No rows returned"

### Option 2: Using Supabase CLI
```bash
cd imperial-trade
supabase db push
```

### Option 3: Using psql (if you have direct database access)
```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20260125_create_insight_xx_analyses.sql
```

## Verify Migration Success

After running the migration, verify the table exists:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'insight_xx_analyses';
```

You should see one row returned.

## Test the Feature

1. Run a new analysis in Insight XX
2. Check the browser console for: `[ProAnalysis] Analysis saved to database successfully`
3. Click the history icon
4. Your analysis should now appear in the history list

## Troubleshooting

If you see errors in the console:
- **"relation 'insight_xx_analyses' does not exist"** → Migration not applied yet
- **"permission denied"** → RLS policies may need adjustment
- **"user_id is null"** → User authentication issue

Check the browser console for detailed error messages with the `[ProAnalysis]` prefix.
