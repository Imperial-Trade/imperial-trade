# Lower User Account Control (UAC) to "Never Notify"
# This prevents Windows from pausing MT5 processes for permission prompts

Write-Host "=== LOWERING UAC SETTINGS ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "Current UAC Level:" -ForegroundColor Yellow
$currentUAC = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "ConsentPromptBehaviorAdmin" -ErrorAction SilentlyContinue).ConsentPromptBehaviorAdmin

switch ($currentUAC) {
    0 { Write-Host "  Never Notify (Already at lowest)" -ForegroundColor Green }
    2 { Write-Host "  Notify me only when apps try to make changes (default)" -ForegroundColor Yellow }
    5 { Write-Host "  Notify me only when apps try to make changes (don't dim desktop)" -ForegroundColor Yellow }
    default { Write-Host "  Current value: $currentUAC" -ForegroundColor Yellow }
}

Write-Host ""
Write-Host "Setting UAC to 'Never Notify' (value: 0)..." -ForegroundColor Yellow

try {
    # Set ConsentPromptBehaviorAdmin to 0 (Never Notify)
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "ConsentPromptBehaviorAdmin" -Value 0 -Type DWord -Force
    
    # Also set EnableLUA to 1 (User Account Control is enabled, but won't prompt)
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableLUA" -Value 1 -Type DWord -Force
    
    Write-Host "✅ UAC settings updated successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: You must RESTART the VPS for changes to take effect" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After restart, UAC will be set to 'Never Notify'" -ForegroundColor White
    Write-Host "This will prevent Windows from pausing MT5 processes for permission prompts" -ForegroundColor White
    Write-Host ""
    
    $restart = Read-Host "Do you want to restart the VPS now? (Y/N)"
    if ($restart -eq 'Y' -or $restart -eq 'y') {
        Write-Host "Restarting VPS in 10 seconds..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        Restart-Computer -Force
    } else {
        Write-Host "Please restart the VPS manually when ready" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Error updating UAC settings: $_" -ForegroundColor Red
    Write-Host "You may need to run this script as Administrator" -ForegroundColor Yellow
    exit 1
}


