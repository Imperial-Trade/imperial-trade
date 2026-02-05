# VPS Configuration Values

## Generated VPS API Key

**VPS_API_KEY:** `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

This key has been:
- ✅ Generated securely using OpenSSL
- ✅ Added to `vps-broker-service/.env` file
- ⏳ Needs to be added to Supabase Edge Function secrets

## Supabase Secrets to Add

### 1. VPS_MT5_SERVICE_URL
```
http://YOUR_VPS_IP:3001
```
**Note:** Replace `YOUR_VPS_IP` with your actual VPS IP address

### 2. VPS_API_KEY
```
bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d
```

## Environment File Created

The `.env` file has been created at: `vps-broker-service/.env`

**Important:** You still need to fill in:
- `SUPABASE_SERVICE_ROLE_KEY` - Get from Supabase dashboard
- `INGEST_SECRET` - Your ingest secret

## Next Steps

1. ✅ API key generated and added to .env
2. ⏳ Add secrets to Supabase (see instructions below)
3. ⏳ Update .env with SUPABASE_SERVICE_ROLE_KEY and INGEST_SECRET
4. ⏳ Deploy service on VPS








