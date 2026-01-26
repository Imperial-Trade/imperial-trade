# Step 4: Final Test - The "Magic" Moment

## 🎯 Test Flow

```
MQL5 EA → Edge Function → Database → Frontend
```

## 📋 Test Checklist

### 1. Verify All Components

- ✅ Go Brain running (systemctl status imperial-brain)
- ✅ Docker image built (docker images | grep imperial-worker)
- ✅ MQL5 EA uploaded (ls /root/imperial-factory/mt5-master/MQL5/Experts/)
- ✅ Edge Function deployed (curl test)
- ✅ Database connection working (check Go Brain logs)

### 2. Create Test Broker Connection

1. Go to your app's broker connection page
2. Add a test broker connection
3. Set `sync_priority` to `1` (instant sync)
4. Verify connection appears in `next_sync_task` view

### 3. Trigger Sync

The Go Brain should:
1. Query `next_sync_task` view
2. Find your test connection
3. Launch Docker container
4. Container runs MT5 with EA
5. EA sends trades to Edge Function
6. Edge Function saves to database

### 4. Monitor Logs

**Go Brain Logs:**
```bash
ssh root@209.222.12.247
journalctl -u imperial-brain -f
```

**Docker Container Logs:**
```bash
docker logs worker_[connection-id]
```

**Edge Function Logs:**
- Supabase Dashboard → Functions → mt5-sync → Logs

### 5. Verify Trades in Database

```sql
-- Check for synced trades
SELECT * FROM trade_journal_entries 
WHERE sync_source = 'mt5_docker' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check connection status
SELECT id, broker_name, last_sync_at, is_syncing, last_ping 
FROM broker_connections 
WHERE is_active = true;
```

## 🎉 Success Indicators

1. ✅ Go Brain logs show: "⚡ Fast Sync Started for: [broker]"
2. ✅ Docker container starts successfully
3. ✅ Edge Function receives trade data
4. ✅ Trades appear in `trade_journal_entries` table
5. ✅ `broker_connections.last_sync_at` updates
6. ✅ Trades appear in frontend journal

## 🔧 Troubleshooting

### Go Brain Not Finding Tasks
- Check `next_sync_task` view has connections
- Verify `is_syncing = false` and `is_active = true`
- Check Go Brain logs for errors

### Container Fails to Start
- Check Docker image exists: `docker images`
- Check MT5 files exist: `ls /root/imperial-factory/mt5-master/`
- Check container logs: `docker logs worker_[id]`

### EA Not Sending Data
- Verify EA is in container: `docker exec worker_[id] ls /mt5/MQL5/Experts/`
- Check EA logs in MT5 terminal
- Verify Edge Function URL in EA code

### Edge Function Errors
- Check function logs in Supabase dashboard
- Verify `x-ingest-key` header matches secret
- Check database connection in function

## 📝 Test Data

You can test with sample trade data:

```bash
curl -X POST https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/mt5-sync \
  -H "Content-Type: application/json" \
  -H "x-ingest-key: Imperial_Secret_2026" \
  -d '{
    "account":"123456",
    "trades":[
      {
        "ticket":"10001",
        "symbol":"EURUSD",
        "pnl":"125.50",
        "dir":"Long"
      }
    ]
  }'
```
