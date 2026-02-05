# Final Verification: Credentials to VPS Flow

## ✅ CONFIRMED: Credentials ARE Sent to VPS

### Evidence from Code

**1. Edge Function (`sync-broker-trades/index.ts`):**

Lines 152-159 show that credentials ARE sent:
```typescript
body: JSON.stringify({
  connection_id: connection.id,
  broker_type: vpsBrokerType,
  encrypted_login: connection.encrypted_login,      // ✅ SENT
  encrypted_password: connection.encrypted_password, // ✅ SENT
  encrypted_server: connection.encrypted_server,     // ✅ SENT
  user_id: user.id
})
```

**2. VPS Service (`vps-broker-service/src/index.ts`):**

Lines 508-513 show it expects and uses credentials:
```typescript
const {
  encrypted_login,
  encrypted_password,
  encrypted_server,
  user_id
} = req.body;
```

Then decrypts and uses them to connect to MT5.

---

## Complete Flow

```
User clicks "Sync Now"
  ↓
Frontend: supabase.functions.invoke('sync-broker-trades', { connection_id })
  ↓
Edge Function: Gets connection from database (with encrypted credentials)
  ↓
Edge Function: Sends to VPS
  POST http://209.222.12.247:3001/fetch-trades
  Body: {
    encrypted_login: "...",
    encrypted_password: "...",
    encrypted_server: "...",
    user_id: "..."
  }
  ↓
VPS Service: Decrypts credentials
  ↓
VPS Service: Connects to MT5 using decrypted credentials
  ↓
VPS Service: Fetches trade history from MT5
  ↓
VPS Service: Returns trades to Edge Function
  ↓
Edge Function: Saves trades to database
  ↓
Frontend: Shows trades in UI
```

---

## Answer

**YES** - Credentials ARE sent to VPS (encrypted)
- Edge Function sends encrypted credentials to VPS `/fetch-trades`
- VPS decrypts and uses them to fetch trade history
- This is the manual sync flow (`sync-broker-trades`)

---

## Testing

Ready to test the actual flow...
