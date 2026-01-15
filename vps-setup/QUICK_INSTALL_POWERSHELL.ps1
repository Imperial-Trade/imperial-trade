# Quick Install PowerShell 7 - One-liner version
Write-Host "Installing PowerShell 7..." -ForegroundColor Cyan

# Check if already installed
if (Get-Command pwsh -ErrorAction SilentlyContinue) {
    Write-Host "PowerShell 7 already installed!" -ForegroundColor Green
    pwsh --version
    exit 0
}

# Try winget first
$winget = Get-Command winget -ErrorAction SilentlyContinue
if ($winget) {
    Write-Host "Using winget..." -ForegroundColor Yellow
    winget install --id Microsoft.PowerShell --source winget --accept-package-agreements --accept-source-agreements --silent
    Start-Sleep -Seconds 3
    if (Get-Command pwsh -ErrorAction SilentlyContinue) {
        Write-Host "✅ Installed via winget!" -ForegroundColor Green
        pwsh --version
        exit 0
    }
}

# Download and install MSI
Write-Host "Downloading PowerShell 7..." -ForegroundColor Yellow
$url = "https://github.com/PowerShell/PowerShell/releases/latest/download/PowerShell-7.4.0-win-x64.msi"
$file = "$env:TEMP\PowerShell-7.msi"

try {
    Invoke-WebRequest -Uri $url -OutFile $file -UseBasicParsing
    Write-Host "Installing..." -ForegroundColor Yellow
    Start-Process msiexec.exe -ArgumentList "/i `"$file`" /quiet /norestart ADD_PATH=1" -Wait -NoNewWindow
    Remove-Item $file -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Installation complete! Restart terminal and run: pwsh" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host "Manual install: https://aka.ms/powershell-release" -ForegroundColor Yellow
}
