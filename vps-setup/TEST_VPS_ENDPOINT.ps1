# Test VPS Endpoint Directly
# This tests the VPS /test-connection endpoint with encrypted credentials

$apiKey = "bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d"
$userId = "test-user-id"
$secret = "ImperialTrade_BrokerEncryption_2025_v1"

# Encrypt credentials using Node.js
Write-Host "🔐 Encrypting credentials..."
$encryptedJson = node -e "
const crypto = require('crypto');
const userId = '$userId';
const secret = '$secret';
function encrypt(plaintext) {
  const keyMaterial = \`\${userId}-\${secret}\`;
  const key = crypto.createHash('sha256').update(keyMaterial).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, encrypted, authTag]);
  return combined.toString('base64');
}
const body = {
  broker_type: 'ecmarkets',
  encrypted_login: encrypt('800107112'),
  encrypted_password: encrypt('Demo@123'),
  encrypted_server: encrypt('ECMarketsLtd-Demo'),
  user_id: userId
};
console.log(JSON.stringify(body));
"

Write-Host "✅ Credentials encrypted"
Write-Host ""

# Test VPS endpoint
Write-Host "📡 Testing VPS /test-connection endpoint..."
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/test-connection" `
        -Method POST `
        -Headers @{
            "X-API-Key" = $apiKey
            "Content-Type" = "application/json"
        } `
        -Body $encryptedJson `
        -ErrorAction Stop

    Write-Host "═══════════════════════════════════════════════════════════════"
    Write-Host "✅ VPS TEST RESULTS"
    Write-Host "═══════════════════════════════════════════════════════════════"
    Write-Host ""

    if ($response.connected) {
        Write-Host "✅ CONNECTION SUCCESSFUL!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 MT5 Account Info:"
        Write-Host "   Login: $($response.account_info.login)"
        Write-Host "   Server: $($response.account_info.server)"
        Write-Host "   Balance: $($response.account_info.balance) $($response.account_info.currency)"
        Write-Host "   Equity: $($response.account_info.equity) $($response.account_info.currency)"
        Write-Host "   Leverage: 1:$($response.account_info.leverage)"
        Write-Host "   Trade Allowed: $($response.account_info.trade_allowed)"
        Write-Host ""
        Write-Host "✅ COMPLETE FLOW VERIFIED:"
        Write-Host "   1. VPS received encrypted credentials ✅"
        Write-Host "   2. VPS decrypted credentials ✅"
        Write-Host "   3. VPS called Python ✅"
        Write-Host "   4. Python connected to MT5 ✅"
        Write-Host "   5. MT5 returned account info ✅"
        Write-Host "   6. Python returned to VPS ✅"
        Write-Host "   7. VPS returned response ✅"
    } else {
        Write-Host "❌ CONNECTION FAILED" -ForegroundColor Red
        Write-Host "   Error: $($response.error)"
    }

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════"
} catch {
    Write-Host "❌ REQUEST FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorContent = $reader.ReadToEnd()
        Write-Host "   Response: $errorContent"
    }
}
