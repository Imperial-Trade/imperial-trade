# Test Pusher Beams Notification Script
Write-Host "Sending test notification to trade_alerts interest..." -ForegroundColor Cyan
Write-Host ""

# Build the notification payload
$body = @{
  interests = @("trade_alerts")
  web = @{
    notification = @{
      title = "Test from PowerShell"
      body = "Pusher Beams is working!"
      icon = "https://tradeimperial.com/icon-192.png"
      deep_link = "https://tradeimperial.com/dashboard/signal-stream"
    }
    data = @{
      test = $true
      timestamp = (Get-Date).ToString("o")
    }
  }
} | ConvertTo-Json -Depth 10

# Set headers
$headers = @{
  "Content-Type" = "application/json"
  "Authorization" = "Bearer 1685210426218696D020B8E06D7729A719D5E7501F5D228F682914D218891199"
}

# Send the notification
try {
  $response = Invoke-RestMethod `
    -Uri "https://de4fb62d-141b-4d1c-98b5-c3ec6e5eec4b.pushnotifications.pusher.com/publish_api/v1/instances/de4fb62d-141b-4d1c-98b5-c3ec6e5eec4b/publishes" `
    -Method Post `
    -Headers $headers `
    -Body $body
  
  Write-Host "SUCCESS!" -ForegroundColor Green
  Write-Host ""
  Write-Host "Publish ID:" $response.publishId -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Check your notification center now!" -ForegroundColor Cyan
} catch {
  Write-Host "FAILED" -ForegroundColor Red
  Write-Host ""
  Write-Host "Error:" $_.Exception.Message -ForegroundColor Red
  if ($_.ErrorDetails) {
    Write-Host ""
    Write-Host "Details:" $_.ErrorDetails.Message -ForegroundColor Red
  }
}
