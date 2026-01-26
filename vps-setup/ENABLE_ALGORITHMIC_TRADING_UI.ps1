# Enable "Allow Algorithmic Trading" in MT5 UI using Windows Automation
# This script uses UI automation to click the checkbox in MT5 Options dialog

Write-Host "=== ENABLING ALGORITHMIC TRADING IN MT5 UI ===" -ForegroundColor Cyan
Write-Host ""

# Add Windows Forms for UI automation
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Function to find MT5 window
function Find-MT5Window {
    $mt5Windows = Get-Process | Where-Object { $_.ProcessName -like '*terminal*' } | ForEach-Object {
        [System.Windows.Forms.Application]::OpenForms | Where-Object { $_.ProcessId -eq $_.Id }
    }
    
    # Alternative: Use Windows API to find window by title
    $mt5Process = Get-Process | Where-Object { $_.MainWindowTitle -like '*MetaTrader*' -or $_.MainWindowTitle -like '*MT5*' } | Select-Object -First 1
    
    if ($mt5Process) {
        Write-Host "✅ Found MT5 window: $($mt5Process.MainWindowTitle)" -ForegroundColor Green
        return $mt5Process
    }
    
    Write-Host "❌ MT5 window not found. Please ensure MT5 is running and visible." -ForegroundColor Red
    return $null
}

# Function to send keyboard shortcuts to open Options
function Open-MT5Options {
    param($mt5Process)
    
    Write-Host "Opening MT5 Options dialog..." -ForegroundColor Yellow
    
    # Activate MT5 window
    [System.Windows.Forms.SendKeys]::SendWait("%{TAB}")  # Alt+Tab to switch to MT5
    Start-Sleep -Milliseconds 500
    
    # Open Options: Tools -> Options (Alt+T, then O)
    [System.Windows.Forms.SendKeys]::SendWait("%T")  # Alt+T (Tools menu)
    Start-Sleep -Milliseconds 300
    [System.Windows.Forms.SendKeys]::SendWait("O")   # O (Options)
    Start-Sleep -Milliseconds 1000  # Wait for Options dialog to open
    
    Write-Host "✅ Options dialog should be open" -ForegroundColor Green
}

# Function to navigate to Expert Advisors tab and enable checkbox
function Enable-AlgorithmicTrading {
    Write-Host "Navigating to Expert Advisors tab..." -ForegroundColor Yellow
    
    # Navigate to Expert Advisors tab (usually 4th tab, use Ctrl+Tab or click)
    # Try pressing Tab multiple times to reach Expert Advisors
    for ($i = 0; $i < 5; $i++) {
        [System.Windows.Forms.SendKeys]::SendWait("{TAB}")
        Start-Sleep -Milliseconds 100
    }
    
    # Or use Ctrl+Tab to switch tabs
    [System.Windows.Forms.SendKeys]::SendWait("^{TAB}")  # Ctrl+Tab
    Start-Sleep -Milliseconds 200
    [System.Windows.Forms.SendKeys]::SendWait("^{TAB}")  # Ctrl+Tab again
    Start-Sleep -Milliseconds 200
    [System.Windows.Forms.SendKeys]::SendWait("^{TAB}")  # Ctrl+Tab again
    Start-Sleep -Milliseconds 200
    [System.Windows.Forms.SendKeys]::SendWait("^{TAB}")  # Ctrl+Tab again (should be on Expert Advisors)
    Start-Sleep -Milliseconds 500
    
    # Find and check "Allow Algorithmic Trading" checkbox
    # The checkbox might be accessible with Space or Enter
    Write-Host "Attempting to enable checkbox..." -ForegroundColor Yellow
    
    # Try pressing Space to toggle checkbox (if focused)
    [System.Windows.Forms.SendKeys]::SendWait(" ")
    Start-Sleep -Milliseconds 300
    
    # Or try navigating with Tab and then Space
    [System.Windows.Forms.SendKeys]::SendWait("{TAB}")
    Start-Sleep -Milliseconds 100
    [System.Windows.Forms.SendKeys]::SendWait("{TAB}")
    Start-Sleep -Milliseconds 100
    [System.Windows.Forms.SendKeys]::SendWait(" ")  # Space to check
    Start-Sleep -Milliseconds 300
    
    Write-Host "✅ Checkbox should be enabled" -ForegroundColor Green
}

# Function to save and close Options
function Close-MT5Options {
    Write-Host "Saving and closing Options dialog..." -ForegroundColor Yellow
    
    # Press Enter or OK button
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Start-Sleep -Milliseconds 500
    
    Write-Host "✅ Options saved" -ForegroundColor Green
}

# Main execution
Write-Host "Step 1: Finding MT5 window..." -ForegroundColor Yellow
$mt5Process = Find-MT5Window

if (-not $mt5Process) {
    Write-Host ""
    Write-Host "❌ Cannot proceed: MT5 window not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please ensure:" -ForegroundColor Yellow
    Write-Host "1. Generic MT5 is running and visible" -ForegroundColor White
    Write-Host "2. MT5 window is not minimized" -ForegroundColor White
    Write-Host "3. You have logged into MT5 at least once" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Step 2: Opening Options dialog..." -ForegroundColor Yellow
Open-MT5Options -mt5Process $mt5Process

Write-Host ""
Write-Host "Step 3: Enabling Algorithmic Trading..." -ForegroundColor Yellow
Enable-AlgorithmicTrading

Write-Host ""
Write-Host "Step 4: Saving settings..." -ForegroundColor Yellow
Close-MT5Options

Write-Host ""
Write-Host "=== COMPLETE ===" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT: This script uses UI automation which may not work perfectly." -ForegroundColor Yellow
Write-Host "   If it doesn't work, please manually enable:" -ForegroundColor White
Write-Host "   Tools -> Options -> Expert Advisors -> Allow Algorithmic Trading" -ForegroundColor White
Write-Host ""


