# Delete All Trades - Execute Now

## Quick Method: Browser Console

Since you're logged in, run this in your browser console at `http://localhost:8080`:

```javascript
(async () => {
  const supabase = window.supabase;
  if (!supabase) { alert('❌ Not on app page'); return; }
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) { alert('❌ Not logged in'); return; }
  
  const { data: trades } = await supabase
    .from('trade_journal_entries')
    .select('id, asset_ticker, pnl, trade_date')
    .eq('user_id', user.id);
  
  if (!trades || trades.length === 0) {
    alert('✅ No trades found. Already empty!');
    return;
  }
  
  const confirmed = confirm(`⚠️ Delete all ${trades.length} trade(s)?\n\nThis cannot be undone!`);
  if (!confirmed) return;
  
  const { error } = await supabase
    .from('trade_journal_entries')
    .delete()
    .eq('user_id', user.id);
  
  if (error) {
    alert('❌ Error: ' + error.message);
  } else {
    alert(`✅ Deleted ${trades.length} trade(s)!\n\nRefreshing page...`);
    window.location.reload();
  }
})();
```

**Steps:**
1. Open `http://localhost:8080` in your browser
2. Make sure you're logged in
3. Press F12 (or Cmd+Option+I) to open Developer Tools
4. Go to Console tab
5. Paste the code above and press Enter
6. Confirm the deletion
7. Page will refresh automatically

Your journal will be reset to "No Trade Logs Yet"!

