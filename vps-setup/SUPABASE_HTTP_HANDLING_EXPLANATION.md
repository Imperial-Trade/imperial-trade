# 🔄 Supabase HTTP Request/Response Handling

## 📋 Overview

Yes! Supabase Edge Functions handle **POST** and **GET** requests to send credentials and receive data. Here's exactly how it works:

---

## 🔄 Request Flow

### 1. Frontend → Supabase Edge Function

**Frontend Code**:
```typescript
// src/components/journal-xx/AutoJournalView.tsx
const { data: testResult, error: testError } = await supabase.functions.invoke(
  'test-broker-connection',
  {
    body: {
      broker_type: 'ecmarkets',
      encrypted_login: encryptedLogin,
      encrypted_password: encryptedPassword,
      encrypted_server: encryptedServer
    }
  }
);
```

**What `supabase.functions.invoke()` Does Automatically**:
- ✅ **Method**: Always uses **POST** (when body is provided)
- ✅ **URL**: Automatically constructs: `https://[project].supabase.co/functions/v1/test-broker-connection`
- ✅ **Headers**: Automatically adds:
  - `Authorization: Bearer [user_session_token]`
  - `Content-Type: application/json`
  - `apikey: [anon_key]`
- ✅ **CORS**: Handled automatically
- ✅ **Body**: JSON stringifies the body object

**Actual HTTP Request**:
```http
POST /functions/v1/test-broker-connection HTTP/1.1
Host: kmuoqkcxguafxulqlbmi.supabase.co
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "broker_type": "ecmarkets",
  "encrypted_login": "aBc123XyZ...",
  "encrypted_password": "dEf456UvW...",
  "encrypted_server": "gHi789QrS..."
}
```

---

## 🎯 Edge Function Handler

**Edge Function Code**:
```typescript
// supabase/functions/test-broker-connection/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Handle CORS pre-flight (OPTIONS request)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Handle POST request
  if (req.method === 'POST') {
    // 1. Parse request body
    const body = await req.json()
    const { encrypted_login, encrypted_password, encrypted_server, broker_type } = body

    // 2. Validate user session (from Authorization header)
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const user = await supabase.auth.getUser(token)

    // 3. Process request (forward to VPS, etc.)
    // ...

    // 4. Return response
    return new Response(
      JSON.stringify({
        success: true,
        connected: true,
        account_info: { ... }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Handle GET request (if needed)
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ message: 'Use POST to test connection' }),
      { status: 405, headers: corsHeaders }
    )
  }
})
```

---

## 📡 Request Methods

### POST Request (Sending Credentials)

**When**: Frontend sends encrypted credentials

**Edge Function Handler**:
```typescript
if (req.method === 'POST') {
  const body = await req.json()
  // Process credentials...
}
```

**Flow**:
```
Frontend (POST with body)
    ↓
Edge Function (receives POST)
    ↓
Parses JSON body
    ↓
Validates user session
    ↓
Forwards to VPS
    ↓
Returns response
```

---

### GET Request (Getting Data)

**When**: Fetching connection status, checking health, etc.

**Example**:
```typescript
// Frontend
const { data } = await supabase.functions.invoke('get-connection-status', {
  method: 'GET'  // Explicitly set GET
})

// Edge Function
if (req.method === 'GET') {
  const url = new URL(req.url)
  const connectionId = url.searchParams.get('connection_id')
  
  // Fetch from database
  const connection = await supabase
    .from('broker_connections')
    .select('*')
    .eq('id', connectionId)
    .single()
  
  return new Response(JSON.stringify(connection), {
    status: 200,
    headers: corsHeaders
  })
}
```

---

## 🔐 Authentication Handling

### Automatic Session Management

**Frontend**:
```typescript
// supabase.functions.invoke() automatically:
// 1. Gets current user session
// 2. Extracts session token
// 3. Adds to Authorization header
const { data: { session } } = await supabase.auth.getSession()
// Token is automatically included in invoke() call
```

**Edge Function**:
```typescript
// Extract token from Authorization header
const authHeader = req.headers.get('Authorization')
if (!authHeader) {
  return new Response(
    JSON.stringify({ error: 'Missing authorization header' }),
    { status: 401, headers: corsHeaders }
  )
}

// Validate user
const token = authHeader.replace('Bearer ', '')
const { data: { user }, error } = await supabase.auth.getUser(token)

if (error || !user) {
  return new Response(
    JSON.stringify({ error: 'Invalid or expired session' }),
    { status: 401, headers: corsHeaders }
  )
}

// User is authenticated - proceed with request
```

---

## 📦 Request/Response Format

### POST Request (Sending Credentials)

**Request Body**:
```json
{
  "broker_type": "ecmarkets",
  "encrypted_login": "aBc123XyZ...",
  "encrypted_password": "dEf456UvW...",
  "encrypted_server": "gHi789QrS..."
}
```

**Response (Success)**:
```json
{
  "success": true,
  "connected": true,
  "account_info": {
    "login": 800107112,
    "server": "ECMarketsLtd-Demo",
    "balance": 1129.46,
    "currency": "USD"
  },
  "server_used": "ECMarketsLtd-Demo",
  "connection_time_ms": 5234
}
```

**Response (Error)**:
```json
{
  "success": false,
  "connected": false,
  "error": "Invalid credentials. Please check your login, password, and server name."
}
```

---

## 🔄 Complete Request/Response Cycle

### Step 1: Frontend Sends POST

```typescript
// Frontend
const { data, error } = await supabase.functions.invoke('test-broker-connection', {
  body: {
    encrypted_login: "...",
    encrypted_password: "...",
    encrypted_server: "..."
  }
})
```

**What Happens**:
1. Supabase SDK gets user session token
2. Constructs URL: `https://[project].supabase.co/functions/v1/test-broker-connection`
3. Makes POST request with:
   - Headers: `Authorization: Bearer [token]`, `Content-Type: application/json`
   - Body: JSON stringified credentials

---

### Step 2: Edge Function Receives POST

```typescript
// Edge Function
serve(async (req) => {
  // CORS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Handle POST
  if (req.method === 'POST') {
    const body = await req.json()
    // Process...
  }
})
```

**What Happens**:
1. Edge Function receives POST request
2. Extracts Authorization header
3. Validates user session
4. Parses JSON body
5. Processes request (forwards to VPS)
6. Returns JSON response

---

### Step 3: Edge Function Returns Response

```typescript
// Edge Function
return new Response(
  JSON.stringify({
    success: true,
    connected: true,
    account_info: { ... }
  }),
  {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  }
)
```

**What Happens**:
1. Edge Function creates Response object
2. Sets status code (200 for success)
3. Sets CORS headers (allows frontend to read response)
4. Returns JSON string

---

### Step 4: Frontend Receives Response

```typescript
// Frontend
const { data, error } = await supabase.functions.invoke(...)

if (error) {
  // Handle error
  console.error('Error:', error)
} else {
  // Handle success
  console.log('Account:', data.account_info)
}
```

**What Happens**:
1. Supabase SDK receives HTTP response
2. Parses JSON body
3. Returns `{ data, error }` object
4. Frontend handles result

---

## 🌐 CORS Handling

### Why CORS is Needed

**Problem**: Browser blocks cross-origin requests unless CORS headers are set

**Solution**: Edge Function sets CORS headers

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

// Pre-flight request (OPTIONS)
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders })
}

// Actual request (POST/GET)
return new Response(JSON.stringify(data), {
  status: 200,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
})
```

**What This Does**:
- ✅ Allows frontend (localhost:5173) to call Edge Function (supabase.co)
- ✅ Allows Authorization header
- ✅ Allows POST and GET methods

---

## 📊 Request/Response Examples

### Example 1: POST - Test Connection

**Request**:
```http
POST /functions/v1/test-broker-connection HTTP/1.1
Host: kmuoqkcxguafxulqlbmi.supabase.co
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "broker_type": "ecmarkets",
  "encrypted_login": "aBc123...",
  "encrypted_password": "dEf456...",
  "encrypted_server": "gHi789..."
}
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: *

{
  "success": true,
  "connected": true,
  "account_info": {
    "login": 800107112,
    "balance": 1129.46
  }
}
```

---

### Example 2: GET - Check Connection Status

**Request**:
```http
GET /functions/v1/get-connection-status?connection_id=abc123 HTTP/1.1
Host: kmuoqkcxguafxulqlbmi.supabase.co
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: *

{
  "connection_id": "abc123",
  "is_active": true,
  "last_sync_at": "2026-01-08T22:00:00Z"
}
```

---

## 🔍 Key Points

### 1. Supabase SDK Handles HTTP Details

**You Don't Need To**:
- ❌ Manually construct URLs
- ❌ Add Authorization headers
- ❌ Handle CORS
- ❌ Stringify JSON

**You Just Do**:
```typescript
await supabase.functions.invoke('function-name', {
  body: { ... }
})
```

---

### 2. Edge Function Handles HTTP Methods

**Edge Function Can Handle**:
- ✅ **POST**: Send data (credentials, trade data, etc.)
- ✅ **GET**: Retrieve data (status, connection info, etc.)
- ✅ **OPTIONS**: CORS pre-flight (automatic)
- ✅ **PUT/PATCH**: Update data (if needed)
- ✅ **DELETE**: Delete data (if needed)

---

### 3. Automatic Authentication

**Frontend**:
```typescript
// Session token is automatically included
await supabase.functions.invoke('function-name', { body: {...} })
```

**Edge Function**:
```typescript
// Extract and validate token
const authHeader = req.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '')
const { data: { user } } = await supabase.auth.getUser(token)
```

---

## ✅ Summary

**Yes! Supabase handles POST and GET requests:**

1. **POST**: Used to send credentials/data
   - Frontend: `supabase.functions.invoke('function', { body: {...} })`
   - Edge Function: `if (req.method === 'POST') { const body = await req.json() }`

2. **GET**: Used to retrieve data
   - Frontend: `supabase.functions.invoke('function', { method: 'GET' })`
   - Edge Function: `if (req.method === 'GET') { const url = new URL(req.url) }`

3. **Automatic Features**:
   - ✅ URL construction
   - ✅ Authorization headers
   - ✅ CORS handling
   - ✅ JSON parsing
   - ✅ Error handling

**Everything is handled automatically by Supabase SDK and Edge Functions!** 🚀
