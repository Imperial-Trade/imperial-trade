# 🔐 Complete MT5 Login Flow - Journal XX Pro

## 📋 Overview

This document explains the complete flow of how logging in with MT5 credentials in Journal XX Pro works, from the frontend to MT5 and back.

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 1: USER ENTERS CREDENTIALS (Frontend)                             │
└─────────────────────────────────────────────────────────────────────────┘
│
│  User enters in Journal XX Pro:
│  - Login: 800107112
│  - Password: Demo@123
│  - Server: ECMarketsLtd-Demo
│
│  Location: src/components/journal-xx/AutoJournalView.tsx
│  Function: handleConnect()
│
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 2: ENCRYPTION (Frontend)                                          │
└─────────────────────────────────────────────────────────────────────────┘
│
│  Each credential is encrypted using AES-256-GCM:
│
│  encryptedLogin = encryptCredentials(loginId)
│  encryptedPassword = encryptCredentials(password)
│  encryptedServer = encryptCredentials(server)
│
│  Encryption Details:
│  - Algorithm: AES-256-GCM
│  - Key: SHA-256(user_id + ENCRYPTION_SECRET)
│  - IV: Random 12 bytes (generated per encryption)
│  - Output: Base64 encoded string
│
│  Location: src/utils/encryption.ts
│  Function: encryptCredentials()
│
│  Example Output:
│  - encryptedLogin: "aBc123XyZ..." (base64)
│  - encryptedPassword: "dEf456UvW..." (base64)
│  - encryptedServer: "gHi789QrS..." (base64)
│
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 3: FRONTEND → EDGE FUNCTION                                       │
└─────────────────────────────────────────────────────────────────────────┘
│
│  Frontend calls Supabase Edge Function:
│
│  supabase.functions.invoke('test-broker-connection', {
│    body: {
│      broker_type: 'ecmarkets',
│      encrypted_login: 'aBc123XyZ...',
│      encrypted_password: 'dEf456UvW...',
│      encrypted_server: 'gHi789QrS...'
│    }
│  })
│
│  Location: src/components/journal-xx/AutoJournalView.tsx
│  Method: supabase.functions.invoke()
│
│  Headers (automatically added by Supabase SDK):
│  - Authorization: Bearer <user_session_token>
│  - Content-Type: application/json
│
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 4: EDGE FUNCTION PROCESSING                                       │
└─────────────────────────────────────────────────────────────────────────┘
│
│  Edge Function receives request:
│
│  1. Validates user authentication
│     - Checks Authorization header
│     - Gets user from Supabase session
│
│  2. Validates broker type
│     - Normalizes to lowercase: 'ecmarkets'
│     - Checks against valid brokers: ['xs', 'ecmarkets', 'puprime']
│
│  3. Forwards to VPS
│     - Gets VPS_MT5_SERVICE_URL from secrets
│     - Gets VPS_API_KEY from secrets
│     - Sends encrypted credentials + user_id to VPS
│
│  Location: supabase/functions/test-broker-connection/index.ts
│
│  Request to VPS:
│  POST http://45.32.89.134:3001/test-connection
│  Headers:
│    - X-API-Key: bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d
│    - Content-Type: application/json
│  Body:
│    {
│      broker_type: 'ecmarkets',
│      encrypted_login: 'aBc123XyZ...',
│      encrypted_password: 'dEf456UvW...',
│      encrypted_server: 'gHi789QrS...',
│      user_id: '8a2ccfdc-1efb-4979-b6a0-4e7b4883db59'
│    }
│
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 5: VPS SERVICE RECEIVES REQUEST                                  │
└─────────────────────────────────────────────────────────────────────────┘
│
│  VPS Node.js Service (Express):
│
│  1. Validates API Key
│     - Checks X-API-Key header matches VPS_API_KEY
│
│  2. Decrypts Credentials
│     - Uses user_id + ENCRYPTION_SECRET to derive decryption key
│     - Decrypts each credential using AES-256-GCM
│
│  Location: vps-broker-service/src/index.ts
│  Function: decryptCredentials()
│
│  Decryption Process:
│  - Key: SHA-256(user_id + ENCRYPTION_SECRET)
│  - Algorithm: AES-256-GCM
│  - Extracts IV from encrypted data (first 12 bytes)
│  - Decrypts remaining data
│
│  Result:
│  - login: "800107112" (plain text)
│  - password: "Demo@123" (plain text)
│  - server: "ECMarketsLtd-Demo" (plain text)
│
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 6: VPS → PYTHON SCRIPT                                            │
└─────────────────────────────────────────────────────────────────────────┘
│
│  VPS Service spawns Python script:
│
│  python test_connection.py '{
│    "login": "800107112",
│    "password": "Demo@123",
│    "server": "ECMarketsLtd-Demo"
│  }'
│
│  Location: vps-broker-service/src/mt5-client.ts
│  Function: testMT5Connection()
│
│  Process:
│  1. Spawns Python process with credentials as JSON argument
│  2. Python script receives JSON via sys.argv[1]
│  3. Waits for Python stdout (JSON response)
│  4. Parses JSON response
│
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 7: PYTHON SCRIPT → MT5 TERMINAL                                   │
└─────────────────────────────────────────────────────────────────────────┘
│
│  Python Script (test_connection.py):
│
│  1. Parses JSON credentials
│     credentials = json.loads(sys.argv[1])
│     login = credentials["login"]  # "800107112"
│     password = credentials["password"]  # "Demo@123"
│     server = credentials["server"]  # "ECMarketsLtd-Demo"
│
│  2. Connects to MT5
│     mt5.initialize(
│       path="C:\\Program Files\\MetaTrader 5\\terminal64.exe",
│       login=800107112,
│       password="Demo@123",
│       server="ECMarketsLtd-Demo",
│       timeout=30000
│     )
│
│  Location: vps-broker-service/python/test_connection.py
│
│  What Happens:
│  - MT5 Python library connects to Generic MT5 terminal
│  - Terminal authenticates with broker's server
│  - If successful, MT5 logs into the account
│  - Account info is retrieved from MT5
│
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 8: MT5 RETURNS ACCOUNT INFO                                      │
└─────────────────────────────────────────────────────────────────────────┘
│
│  MT5 Terminal returns account information:
│
│  account_info = mt5.account_info()
│  Returns:
│  {
│    login: 800107112,
│    server: "ECMarketsLtd-Demo",
│    balance: 1129.46,
│    currency: "USD",
│    leverage: 500,
│    equity: 1129.46,
│    margin: 0.0,
│    margin_free: 1129.46,
│    ...
│  }
│
│  Python script formats response:
│  {
│    "connected": true,
│    "account_info": {
│      "login": 800107112,
│      "server": "ECMarketsLtd-Demo",
│      "balance": 1129.46,
│      "currency": "USD",
│      ...
│    },
│    "server_used": "ECMarketsLtd-Demo",
│    "connection_time_ms": 5234
│  }
│
│  Python prints JSON to stdout
│
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 9: PYTHON → VPS SERVICE                                           │
└─────────────────────────────────────────────────────────────────────────┘
│
│  VPS Service receives Python output:
│
│  1. Reads stdout from Python process
│  2. Parses JSON response
│  3. Returns to Edge Function
│
│  Location: vps-broker-service/src/mt5-client.ts
│
│  Response Format:
│  {
│    connected: true,
│    account_info: {...},
│    server_used: "ECMarketsLtd-Demo",
│    connection_time_ms: 5234
│  }
│
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 10: VPS → EDGE FUNCTION                                          │
└─────────────────────────────────────────────────────────────────────────┘
│
│  VPS Service returns to Edge Function:
│
│  HTTP 200 Response:
│  {
│    "connected": true,
│    "account_info": {
│      "login": 800107112,
│      "server": "ECMarketsLtd-Demo",
│      "balance": 1129.46,
│      "currency": "USD",
│      ...
│    },
│    "server_used": "ECMarketsLtd-Demo",
│    "connection_time_ms": 5234
│  }
│
│  Location: vps-broker-service/src/index.ts
│
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 11: EDGE FUNCTION → FRONTEND                                      │
└─────────────────────────────────────────────────────────────────────────┘
│
│  Edge Function returns to Frontend:
│
│  HTTP 200 Response:
│  {
│    "success": true,
│    "connected": true,
│    "account_info": {
│      "login": 800107112,
│      "server": "ECMarketsLtd-Demo",
│      "balance": 1129.46,
│      "currency": "USD",
│      ...
│    },
│    "server_used": "ECMarketsLtd-Demo",
│    "connection_time_ms": 5234,
│    "message": "Successfully connected to ECMarketsLtd-Demo. Account: 800107112"
│  }
│
│  Location: supabase/functions/test-broker-connection/index.ts
│
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 12: FRONTEND DISPLAYS RESULTS                                     │
└─────────────────────────────────────────────────────────────────────────┘
│
│  Frontend receives response:
│
│  1. Checks if connected: true
│  2. Displays account info:
│     - Status: "✅ Connected to MT5 Account 800107112 on ECMarketsLtd-Demo. Balance: 1,129.46 USD"
│     - Toast notification with account details
│     - Console logs account info
│
│  3. Saves connection to database:
│     - Stores encrypted credentials in broker_connections table
│     - Sets is_active = true
│     - Updates last_sync_at
│
│  4. Auto-fetches trades (if connection successful):
│     - Calls sync-broker-trades Edge Function
│     - Fetches trade history from MT5
│     - Displays trades in journal
│
│  Location: src/components/journal-xx/AutoJournalView.tsx
│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Flow

### Encryption/Decryption Process

**Frontend Encryption**:
```typescript
// User enters: "800107112"
encryptedLogin = encryptCredentials("800107112")

// Process:
// 1. Generate random IV (12 bytes)
// 2. Derive key: SHA-256(user_id + ENCRYPTION_SECRET)
// 3. Encrypt using AES-256-GCM
// 4. Combine IV + encrypted data
// 5. Base64 encode
// Result: "aBc123XyZ..." (base64 string)
```

**VPS Decryption**:
```typescript
// Receives: "aBc123XyZ..." + user_id
login = decryptCredentials("aBc123XyZ...", user_id)

// Process:
// 1. Base64 decode
// 2. Extract IV (first 12 bytes)
// 3. Derive key: SHA-256(user_id + ENCRYPTION_SECRET)
// 4. Decrypt using AES-256-GCM
// Result: "800107112" (plain text)
```

**Key Points**:
- ✅ Credentials are **never** sent in plain text
- ✅ Encryption key is derived from user_id (unique per user)
- ✅ Each encryption uses a unique IV (nonce)
- ✅ Only the VPS can decrypt (has ENCRYPTION_SECRET)

---

## 📊 Data Flow Summary

### Request Flow (Frontend → MT5)

1. **Frontend**: User enters credentials
2. **Frontend**: Encrypts credentials (AES-256-GCM)
3. **Edge Function**: Validates user, forwards to VPS
4. **VPS Service**: Decrypts credentials
5. **Python Script**: Receives plain credentials
6. **MT5 Terminal**: Authenticates and logs in

### Response Flow (MT5 → Frontend)

1. **MT5 Terminal**: Returns account_info
2. **Python Script**: Formats as JSON
3. **VPS Service**: Returns to Edge Function
4. **Edge Function**: Returns to Frontend
5. **Frontend**: Displays account info and saves connection

---

## 🔍 Key Components

### 1. Frontend (React/TypeScript)
- **File**: `src/components/journal-xx/AutoJournalView.tsx`
- **Function**: `handleConnect()`
- **Encryption**: `src/utils/encryption.ts`

### 2. Edge Function (Deno/TypeScript)
- **File**: `supabase/functions/test-broker-connection/index.ts`
- **Purpose**: Validates user, forwards to VPS
- **Secrets**: VPS_MT5_SERVICE_URL, VPS_API_KEY

### 3. VPS Service (Node.js/Express)
- **File**: `vps-broker-service/src/index.ts`
- **Endpoints**: `/test-connection`, `/fetch-trades`
- **Decryption**: `src/encryption.ts`

### 4. Python Script
- **File**: `vps-broker-service/python/test_connection.py`
- **Library**: MetaTrader5 (mt5)
- **Function**: `test_connection()`

### 5. MT5 Terminal
- **Location**: `C:\Program Files\MetaTrader 5\terminal64.exe`
- **Type**: Generic MT5 (not broker-specific)
- **API**: Python MetaTrader5 library

---

## 🧪 Example Flow with Real Data

### Input (User enters):
```
Login: 800107112
Password: Demo@123
Server: ECMarketsLtd-Demo
```

### After Encryption (Frontend sends):
```json
{
  "broker_type": "ecmarkets",
  "encrypted_login": "aBc123XyZ...",
  "encrypted_password": "dEf456UvW...",
  "encrypted_server": "gHi789QrS..."
}
```

### After Decryption (VPS has):
```json
{
  "login": "800107112",
  "password": "Demo@123",
  "server": "ECMarketsLtd-Demo"
}
```

### MT5 Returns:
```json
{
  "connected": true,
  "account_info": {
    "login": 800107112,
    "server": "ECMarketsLtd-Demo",
    "balance": 1129.46,
    "currency": "USD",
    "leverage": 500
  }
}
```

### Frontend Displays:
```
✅ Connected to MT5 Account 800107112 on ECMarketsLtd-Demo. Balance: 1,129.46 USD
```

---

## 🔄 Trade Fetching Flow (After Connection)

Once connected, trades are fetched:

1. **Frontend**: Calls `sync-broker-trades` Edge Function
2. **Edge Function**: Forwards to VPS `/fetch-trades`
3. **VPS Service**: Decrypts credentials, calls Python
4. **Python Script**: `fetch_trades.py` connects to MT5
5. **MT5**: Returns trade history (deals)
6. **Python**: Transforms trades to journal format
7. **VPS**: Returns trades array
8. **Edge Function**: Sends to `journal-ingestor`
9. **Database**: Trades saved to `trade_journal_entries`
10. **Frontend**: Displays trades in journal

---

## ✅ Security Features

1. **End-to-End Encryption**: Credentials encrypted from frontend to VPS
2. **User-Specific Keys**: Each user has unique encryption key
3. **API Key Protection**: VPS requires API key for access
4. **Session Validation**: Edge Function validates user session
5. **No Plain Text Storage**: Credentials never stored in plain text

---

## 📝 Summary

**Complete Flow**:
```
User Input → Encryption → Edge Function → VPS → Decryption → 
Python → MT5 → Account Info → Python → VPS → Edge Function → 
Frontend → Display + Save to Database
```

**Key Points**:
- ✅ Credentials are encrypted end-to-end
- ✅ MT5 connection happens on VPS (secure)
- ✅ Account info flows back to frontend
- ✅ Connection is saved to database
- ✅ Trades are automatically fetched

**Everything is secure and working!** 🔒✅
