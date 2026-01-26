. # Auto-Configure MT5 Expert Advisors Settings
# This script modifies MT5's configuration to enable algorithmic trading

$mt5ConfigPath = "$env:APPDATA\MetaQuotes\Terminal"
Write-Host "Searching for MT5 configuration files in: $mt5ConfigPath"

if (-not (Test-Path $mt5ConfigPath)) {
    Write-Host "❌ MT5 config directory not found. Please run MT5 at least once first."
    exit 1
}

# Find all common.ini files (one per MT5 instance)
$configFiles = Get-ChildItem -Path $mt5ConfigPath -Recurse -Filter "common.ini" -ErrorAction SilentlyContinue

if ($configFiles.Count -eq 0) {
    Write-Host "❌ No MT5 configuration files found. Please run MT5 at least once first."
    exit 1
}

Write-Host "Found $($configFiles.Count) MT5 configuration file(s)"
Write-Host ""

foreach ($configFile in $configFiles) {
    Write-Host "Processing: $($configFile.FullName)"
    
    # Read current config
    $content = Get-Content -Path $configFile.FullName -Raw -ErrorAction SilentlyContinue
    
    if (-not $content) {
        Write-Host "   ⚠️  Could not read config file"
        continue
    }
    
    $modified = $false
    
    # Check and enable "Allow algorithmic trading"
    if ($content -notmatch 'AllowAutoTrading\s*=\s*true') {
        Write-Host "   ✅ Enabling 'Allow algorithmic trading'..."
        
        # Add or modify [Experts] section
        if ($content -match '\[Experts\]') {
            # Section exists, modify it
            if ($content -match 'AllowAutoTrading\s*=') {
                $content = $content -replace 'AllowAutoTrading\s*=.*', 'AllowAutoTrading=true'
            } else {
                $content = $content -replace '(\[Experts\])', "`$1`r`nAllowAutoTrading=true"
            }
        } else {
            # Add [Experts] section
            $content += "`r`n[Experts]`r`nAllowAutoTrading=true`r`n"
        }
        
        $modified = $true
    } else {
        Write-Host "   ✅ 'Allow algorithmic trading' already enabled"
    }
    
    # Check and enable "Allow DLL imports" (optional but recommended)
    if ($content -notmatch 'AllowDllImports\s*=\s*true') {
        Write-Host "   ✅ Enabling 'Allow DLL imports'..."
        
        if ($content -match '\[Experts\]') {
            if ($content -match 'AllowDllImports\s*=') {
                $content = $content -replace 'AllowDllImports\s*=.*', 'AllowDllImports=true'
            } else {
                $content = $content -replace '(\[Experts\])', "`$1`r`nAllowDllImports=true"
            }
        } else {
            $content += "`r`n[Experts]`r`nAllowDllImports=true`r`n"
        }
        
        $modified = $true
    } else {
        Write-Host "   ✅ 'Allow DLL imports' already enabled"
    }
    
    # Save modified config
    if ($modified) {
        try {
            # Backup original
            $backupPath = "$($configFile.FullName).backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
            Copy-Item -Path $configFile.FullName -Destination $backupPath -Force
            Write-Host "   💾 Backup created: $backupPath"
            
            # Write modified config
            Set-Content -Path $configFile.FullName -Value $content -NoNewline -Force
            Write-Host "   ✅ Configuration updated successfully"
        } catch {
            Write-Host "   ❌ Error updating config: $_"
        }
    } else {
        Write-Host "   ℹ️  No changes needed"
    }
    
    Write-Host ""
}

Write-Host "=========================================="
Write-Host "Configuration Complete!"
Write-Host "=========================================="
Write-Host ""
Write-Host "Next Steps:"
Write-Host "1. Restart Generic MT5 (if running)"
Write-Host "2. Open Generic MT5 manually"
Write-Host "3. Verify settings: Tools - Options - Expert Advisors"
Write-Host "   - Allow algorithmic trading should be checked"
Write-Host "4. Log in manually once with your credentials"
Write-Host "5. Keep terminal open"
Write-Host ""
Write-Host "After these steps, Python connections should work"

