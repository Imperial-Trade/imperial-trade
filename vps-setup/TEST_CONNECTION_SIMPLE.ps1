# Simple connection test
$VPS_URL = "http://localhost:3001"
$API_KEY = "bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d"
$USER_ID = "8a2ccfdc-1efb-4979-b6a0-4e7b4883db59"

$body = @{
    broker_type = "EC_MARKETS"
    encrypted_login = "800107112"
    encrypted_password = "Demo@123"
    encrypted_server = "ECMarketsLtd-Demo"
    user_id = $USER_ID
} | ConvertTo-Json

Write-Host "Testing connection..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "$VPS_URL/test-connection" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-API-Key" = $API_KEY
        } `
        -Body $body `
        -TimeoutSec 50 `
        -UseBasicParsing `
        -ErrorAction Stop
    
    Write-Host "Response:" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error body:" -ForegroundColor Red
        Write-Host $errorBody
    }
}


