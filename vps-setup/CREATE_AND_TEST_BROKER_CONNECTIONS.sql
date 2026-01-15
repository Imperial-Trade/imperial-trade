-- Create 3 broker connections and test them
-- Accounts:
-- 1. PU Prime: Login 18448879, Password wb6V8e^t, Server PUPrime-Live4
-- 2. XS: Login 11321405, Password U!27bc5h, Server XSFintech-REAL-3
-- 3. EC Markets Demo: Login 800107112, Password Demo@123, Server ECMarkets-MT5-Demo

-- Note: Credentials will be stored as-is for now (frontend typically encrypts them)
-- The Edge Function will encrypt them when sending to VPS if they're plain

-- User ID (from previous query)
-- User: muahammadbilal0786@gmail.com
-- ID: 8a2ccfdc-1efb-4979-b6a0-4e7b4883db59

-- 1. PU Prime Account
INSERT INTO broker_connections (
  id,
  user_id,
  broker_type,
  encrypted_login,
  encrypted_password,
  encrypted_server,
  credentials_hash,
  is_active,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  '8a2ccfdc-1efb-4979-b6a0-4e7b4883db59',
  'mt5',
  '18448879',  -- Will be encrypted by frontend/Edge Function if needed
  'wb6V8e^t',
  'PUPrime-Live4',
  encode(digest('18448879:wb6V8e^t:PUPrime-Live4', 'sha256'), 'hex'),
  true,
  NOW(),
  NOW()
)
ON CONFLICT (credentials_hash) DO NOTHING
RETURNING id, broker_type, encrypted_server;

-- 2. XS Account
INSERT INTO broker_connections (
  id,
  user_id,
  broker_type,
  encrypted_login,
  encrypted_password,
  encrypted_server,
  credentials_hash,
  is_active,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  '8a2ccfdc-1efb-4979-b6a0-4e7b4883db59',
  'mt5',
  '11321405',
  'U!27bc5h',
  'XSFintech-REAL-3',
  encode(digest('11321405:U!27bc5h:XSFintech-REAL-3', 'sha256'), 'hex'),
  true,
  NOW(),
  NOW()
)
ON CONFLICT (credentials_hash) DO NOTHING
RETURNING id, broker_type, encrypted_server;

-- 3. EC Markets Demo Account
INSERT INTO broker_connections (
  id,
  user_id,
  broker_type,
  encrypted_login,
  encrypted_password,
  encrypted_server,
  credentials_hash,
  is_active,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  '8a2ccfdc-1efb-4979-b6a0-4e7b4883db59',
  'mt5',
  '800107112',
  'Demo@123',
  'ECMarkets-MT5-Demo',
  encode(digest('800107112:Demo@123:ECMarkets-MT5-Demo', 'sha256'), 'hex'),
  true,
  NOW(),
  NOW()
)
ON CONFLICT (credentials_hash) DO NOTHING
RETURNING id, broker_type, encrypted_server;

-- Get all active connections for testing
SELECT 
  id,
  broker_type,
  encrypted_server as server,
  is_active,
  created_at
FROM broker_connections
WHERE user_id = '8a2ccfdc-1efb-4979-b6a0-4e7b4883db59'
  AND is_active = true
ORDER BY created_at DESC;


