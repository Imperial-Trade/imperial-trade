# Delete All Trades - Instructions

## Method 1: Browser Console (Easiest)

1. Open your browser and go to `http://localhost:8080`
2. Open Developer Tools (F12 or Cmd+Option+I)
3. Go to the Console tab
4. Make sure you're logged in
5. Paste and run this command:

```javascript
// Delete all trades for current user
(async () => {
  const { supabase } = await import('/src/integrations/supabase/client.ts');
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('❌ Not logged in. Please log in first.');
    return;
  }
  
  console.log('🔍 Fetching all trades...');
  const { data: trades, error: fetchError } = await supabase
    .from('trade_journal_entries')
    .select('id, asset_ticker, pnl, trade_date')
    .eq('user_id', user.id);
  
  if (fetchError) {
    console.error('❌ Error:', fetchError);
    return;
  }
  
  if (!trades || trades.length === 0) {
    console.log('✅ No trades found.');
    return;
  }
  
  console.log(`📊 Found ${trades.length} trade(s):`);
  trades.forEach((t, i) => console.log(`  ${i+1}. ${t.asset_ticker} - $${t.pnl}`));
  
  const confirmed = confirm(`⚠️ Delete all ${trades.length} trade(s)? This cannot be undone!`);
  if (!confirmed) {
    console.log('❌ Cancelled.');
    return;
  }
  
  const { error: deleteError } = await supabase
    .from('trade_journal_entries')
    .delete()
    .eq('user_id', user.id);
  
  if (deleteError) {
    console.error('❌ Error deleting:', deleteError);
  } else {
    console.log(`✅ Successfully deleted ${trades.length} trade(s)!`);
    console.log('🔄 Please refresh the page to see the changes.');
  }
})();
```

## Method 2: Supabase SQL Editor (Admin)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Run this SQL (WARNING: This deletes ALL trades for ALL users):

```sql
-- DELETE ALL TRADES (ALL USERS)
DELETE FROM trade_journal_entries;

-- Or delete only for a specific user (replace USER_ID):
-- DELETE FROM trade_journal_entries WHERE user_id = 'USER_ID_HERE';
```

## Method 3: Using the Supabase Client in Code

If you want to add this as a temporary function, you can access it via browser console:

```javascript
// In browser console, after page loads:
window.supabase.from('trade_journal_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000').then(console.log);
```

**Note:** This requires you to be authenticated and will only delete your own trades due to RLS policies.

