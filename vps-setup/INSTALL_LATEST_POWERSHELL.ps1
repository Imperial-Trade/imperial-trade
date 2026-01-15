# Install Latest PowerShell 7 on Windows VPS
Write-Host "=== Installing Latest PowerShell 7 ===" -ForegroundColor Cyan
Write-Host ""

# Check current PowerShell version
Write-Host "Current PowerShell Version:" -ForegroundColor Yellow
$PSVersionTable.PSVersion
Write-Host ""

# Check if PowerShell 7 is already installed
$pwshPath = Get-Command pwsh -ErrorAction SilentlyContinue
if ($pwshPath) {
    Write-Host "PowerShell 7 is already installed!" -ForegroundColor Green
    Write-Host "Location: $($pwshPath.Source)" -ForegroundColor Gray
    pwsh --version
    Write-Host ""
    Write-Host "To use PowerShell 7, run: pwsh" -ForegroundColor Yellow
    exit 0
}

Write-Host "PowerShell 7 not found. Installing..." -ForegroundColor Yellow
Write-Host ""

# Method 1: Try winget (Windows Package Manager)
Write-Host "Attempting to install via winget..." -ForegroundColor Cyan
try {
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        Write-Host "Using winget to install PowerShell..." -ForegroundColor Green
        winget install --id Microsoft.PowerShell --source winget --accept-package-agreements --accept-source-agreements
        Write-Host ""
        Write-Host "Installation complete!" -ForegroundColor Green
        Write-Host "Restart your terminal or run: pwsh" -ForegroundColor Yellow
        exit 0
    } else {
        Write-Host "winget not available. Trying direct download..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "winget failed. Trying direct download..." -ForegroundColor Yellow
}

# Method 2: Download and install MSI directly
Write-Host ""
Write-Host "Downloading PowerShell 7 MSI installer..." -ForegroundColor Cyan

$downloadUrl = "https://github.com/PowerShell/PowerShell/releases/latest/download/PowerShell-7.4.0-win-x64.msi"
$installerPath = "$env:TEMP\PowerShell-7-latest.msi"

try {
    # Get latest version URL
    $latestRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/PowerShell/PowerShell/releases/latest"
    $msiAsset = $latestRelease.assets | Where-Object { $_.name -like "PowerShell-*-win-x64.msi" } | Select-Object -First 1
    
    if ($msiAsset) {
        $downloadUrl = $msiAsset.browser_download_url
        Write-Host "Latest version: $($latestRelease.tag_name)" -ForegroundColor Green
        Write-Host "Download URL: $downloadUrl" -ForegroundColor Gray
    }
} catch {
    Write-Host "Could not fetch latest version info. Using default URL..." -ForegroundColor Yellow
}

Write-Host "Downloading from: $downloadUrl" -ForegroundColor Gray
Write-Host "Saving to: $installerPath" -ForegroundColor Gray

try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing
    Write-Host "Download complete!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Installing PowerShell 7..." -ForegroundColor Cyan
    Write-Host "This may take a minute..." -ForegroundColor Gray
    
    # Install MSI silently
    $installArgs = "/i `"$installerPath`" /quiet /norestart ADD_EXPLORER_CONTEXT_MENU_OPENPOWERSHELL=1 ADD_FILE_CONTEXT_MENU_RUNPOWERSHELL=1 ENABLE_PSREMOTING=1 REGISTER_MANIFEST=1 USE_MU=1 ENABLE_MU=1 ADD_PATH=1"
    
    Start-Process -FilePath "msiexec.exe" -ArgumentList $installArgs -Wait -NoNewWindow
    
    Write-Host ""
    Write-Host "Installation complete!" -ForegroundColor Green
    Write-Host ""
    
    # Clean up installer
    if (Test-Path $installerPath) {
        Remove-Item $installerPath -Force
        Write-Host "Installer cleaned up." -ForegroundColor Gray
    }
    
    # Verify installation
    Write-Host ""
    Write-Host "Verifying installation..." -ForegroundColor Cyan
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    Start-Sleep -Seconds 2
    
    $pwshCheck = Get-Command pwsh -ErrorAction SilentlyContinue
    if ($pwshCheck) {
        Write-Host "✅ PowerShell 7 installed successfully!" -ForegroundColor Green
        Write-Host "Location: $($pwshCheck.Source)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "To use PowerShell 7, run: pwsh" -ForegroundColor Yellow
        Write-Host "Or restart your terminal and run: pwsh" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️ Installation may have completed, but pwsh not found in PATH yet." -ForegroundColor Yellow
        Write-Host "Please restart your terminal or run: refreshenv" -ForegroundColor Yellow
        Write-Host "Then run: pwsh" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Error during installation: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual installation:" -ForegroundColor Yellow
    Write-Host "1. Visit: https://aka.ms/powershell-release" -ForegroundColor Gray
    Write-Host "2. Download PowerShell 7 MSI" -ForegroundColor Gray
    Write-Host "3. Run the installer" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
