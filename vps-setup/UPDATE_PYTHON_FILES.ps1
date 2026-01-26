# Update Python files with algorithmic trading checks
$testConnectionPath = "C:\vps-broker-service\python\test_connection.py"
$fetchTradesPath = "C:\vps-broker-service\python\fetch_trades.py"

# Read current test_connection.py
$testContent = Get-Content $testConnectionPath -Raw

# Add check after initialization (if not already present)
if ($testContent -notmatch 'terminal_info\.trade_allowed') {
    $checkCode = @'

        # Check if algorithmic trading is enabled
        terminal_info = mt5.terminal_info()
        if terminal_info:
            # terminal_info.trade_allowed indicates if algorithmic trading is enabled
            if not terminal_info.trade_allowed:
                print("⚠️  WARNING: Algorithmic Trading is NOT enabled in MT5 terminal")
                print("   This may cause issues with trade fetching. Please enable it in:")
                print("   Tools → Options → Expert Advisors → Allow Algorithmic Trading")
                # Note: We continue anyway as the user may have enabled it manually
'@
    
    # Insert after initialized_by_us = True
    $testContent = $testContent -replace '(initialized_by_us = True)', "`$1$checkCode"
    Set-Content -Path $testConnectionPath -Value $testContent -NoNewline
    Write-Host "✅ Updated test_connection.py" -ForegroundColor Green
} else {
    Write-Host "✅ test_connection.py already has algorithmic trading check" -ForegroundColor Green
}

# Read current fetch_trades.py
$fetchContent = Get-Content $fetchTradesPath -Raw

# Add check after initialization (if not already present)
if ($fetchContent -notmatch 'terminal_info\.trade_allowed') {
    $checkCode = @'

        # Check if algorithmic trading is enabled
        terminal_info = mt5.terminal_info()
        if terminal_info and not terminal_info.trade_allowed:
            print("⚠️  WARNING: Algorithmic Trading is NOT enabled in MT5 terminal")
            print("   This may cause issues with trade fetching. Please enable it in:")
            print("   Tools → Options → Expert Advisors → Allow Algorithmic Trading")
            # Note: We continue anyway as the user may have enabled it manually
'@
    
    # Insert after initialized_by_us = True
    $fetchContent = $fetchContent -replace '(initialized_by_us = True)', "`$1$checkCode"
    Set-Content -Path $fetchTradesPath -Value $fetchContent -NoNewline
    Write-Host "✅ Updated fetch_trades.py" -ForegroundColor Green
} else {
    Write-Host "✅ fetch_trades.py already has algorithmic trading check" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Python files updated successfully" -ForegroundColor Green


