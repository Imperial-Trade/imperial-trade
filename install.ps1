#Requires -Version 5.1
<#
.SYNOPSIS
    Imperial Trade Installation Script
.DESCRIPTION
    Automated installation script for the Imperial Trade application.
    This script will check prerequisites, clone the repository, install dependencies,
    and guide you through the initial setup.
.NOTES
    Version: 1.0.0
    Author: Imperial Trade Team
#>

# Set error action preference
$ErrorActionPreference = "Stop"

# Script configuration
$RepoUrl = "https://github.com/Imperial-Trade/imperial-trade.git"
$ProjectName = "imperial-trade"
$NodeMinVersion = "18.0.0"

# Colors for output
function Write-ColorOutput {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        [string]$ForegroundColor = "White"
    )
    Write-Host $Message -ForegroundColor $ForegroundColor
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "✗ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "ℹ $Message" -ForegroundColor Cyan
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠ $Message" -ForegroundColor Yellow
}

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-ColorOutput "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-ColorOutput "  $Message" -ForegroundColor Magenta
    Write-ColorOutput "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host ""
}

# Check if a command exists
function Test-Command {
    param([string]$Command)
    try {
        if (Get-Command $Command -ErrorAction SilentlyContinue) {
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

# Compare version numbers
function Test-MinimumVersion {
    param(
        [string]$Current,
        [string]$Required
    )
    try {
        $currentVersion = [version]($Current -replace 'v', '')
        $requiredVersion = [version]$Required
        return $currentVersion -ge $requiredVersion
    } catch {
        return $false
    }
}

# Check prerequisites
function Test-Prerequisites {
    Write-Header "Checking Prerequisites"

    $allPrereqsMet = $true

    # Check for Git
    Write-Info "Checking for Git..."
    if (Test-Command "git") {
        $gitVersion = git --version 2>&1 | Select-String -Pattern "[\d\.]+" | ForEach-Object { $_.Matches[0].Value }
        Write-Success "Git is installed (version $gitVersion)"
    } else {
        Write-Error "Git is not installed"
        Write-Info "Please install Git from: https://git-scm.com/download/win"
        $allPrereqsMet = $false
    }

    # Check for Node.js
    Write-Info "Checking for Node.js..."
    if (Test-Command "node") {
        $nodeVersion = node --version 2>&1
        $nodeVersionClean = $nodeVersion -replace 'v', ''

        if (Test-MinimumVersion -Current $nodeVersion -Required $NodeMinVersion) {
            Write-Success "Node.js is installed ($nodeVersion)"
        } else {
            Write-Warning "Node.js version $nodeVersion is installed, but version $NodeMinVersion or higher is recommended"
            Write-Info "Download the latest version from: https://nodejs.org/"
        }
    } else {
        Write-Error "Node.js is not installed"
        Write-Info "Please install Node.js $NodeMinVersion or higher from: https://nodejs.org/"
        $allPrereqsMet = $false
    }

    # Check for npm
    Write-Info "Checking for npm..."
    if (Test-Command "npm") {
        $npmVersion = npm --version 2>&1
        Write-Success "npm is installed (version $npmVersion)"
    } else {
        Write-Error "npm is not installed"
        Write-Info "npm is typically installed with Node.js. Please reinstall Node.js from: https://nodejs.org/"
        $allPrereqsMet = $false
    }

    Write-Host ""
    return $allPrereqsMet
}

# Clone or update repository
function Install-Repository {
    param([string]$TargetPath)

    Write-Header "Setting Up Repository"

    if (Test-Path $TargetPath) {
        Write-Warning "Directory '$TargetPath' already exists"
        $response = Read-Host "Do you want to use the existing directory? (Y/N)"

        if ($response -eq 'Y' -or $response -eq 'y') {
            Write-Info "Using existing directory..."
            Set-Location $TargetPath

            # Check if it's a git repository
            if (Test-Path ".git") {
                Write-Info "Updating repository..."
                try {
                    git pull origin main 2>&1 | Out-Null
                    Write-Success "Repository updated"
                } catch {
                    Write-Warning "Could not update repository. Continuing with existing files..."
                }
            } else {
                Write-Warning "Directory exists but is not a git repository"
            }
        } else {
            Write-Error "Installation cancelled. Please choose a different location or remove the existing directory."
            exit 1
        }
    } else {
        Write-Info "Cloning repository from $RepoUrl..."
        try {
            git clone $RepoUrl $TargetPath 2>&1 | Out-Null
            Set-Location $TargetPath
            Write-Success "Repository cloned successfully"
        } catch {
            Write-Error "Failed to clone repository: $_"
            exit 1
        }
    }
    Write-Host ""
}

# Install dependencies
function Install-Dependencies {
    Write-Header "Installing Dependencies"

    Write-Info "Installing npm packages... This may take a few minutes..."
    try {
        npm install
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Dependencies installed successfully"
        } else {
            Write-Error "Failed to install dependencies"
            exit 1
        }
    } catch {
        Write-Error "Failed to install dependencies: $_"
        exit 1
    }
    Write-Host ""
}

# Setup environment file
function Initialize-Environment {
    Write-Header "Environment Configuration"

    if (Test-Path ".env") {
        Write-Warning ".env file already exists"
        $response = Read-Host "Do you want to reconfigure it? (Y/N)"

        if ($response -ne 'Y' -and $response -ne 'y') {
            Write-Info "Skipping environment configuration"
            Write-Host ""
            return
        }
    }

    Write-Info "Creating .env file from template..."
    Copy-Item ".env.example" ".env" -Force
    Write-Success ".env file created"

    Write-Host ""
    Write-Warning "IMPORTANT: You need to configure your environment variables!"
    Write-Host ""
    Write-Info "Please edit the .env file and provide the following:"
    Write-Host "  • VITE_SUPABASE_URL - Your Supabase project URL"
    Write-Host "  • VITE_SUPABASE_ANON_KEY - Your Supabase anonymous key"
    Write-Host "  • ONESIGNAL_APP_ID (optional) - Your OneSignal App ID"
    Write-Host "  • ONESIGNAL_API_KEY (optional) - Your OneSignal API Key"
    Write-Host ""

    $response = Read-Host "Would you like to open the .env file now? (Y/N)"
    if ($response -eq 'Y' -or $response -eq 'y') {
        if (Test-Command "code") {
            code .env
            Write-Success "Opening .env in VS Code..."
        } elseif (Test-Command "notepad") {
            notepad .env
            Write-Success "Opening .env in Notepad..."
        } else {
            Write-Info "Please edit .env manually with your preferred text editor"
        }
    }

    Write-Host ""
}

# Display next steps
function Show-NextSteps {
    Write-Header "Installation Complete!"

    Write-Success "Imperial Trade has been successfully installed!"
    Write-Host ""
    Write-ColorOutput "Next Steps:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1. Configure your environment variables in the .env file"
    Write-Host "  2. Start the development server:"
    Write-ColorOutput "     npm run dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  3. Open your browser to the URL displayed by the dev server"
    Write-Host "     (typically http://localhost:5173)"
    Write-Host ""
    Write-Host "Other useful commands:"
    Write-ColorOutput "  npm run build" -ForegroundColor Cyan -NoNewline
    Write-Host "       - Build for production"
    Write-ColorOutput "  npm run preview" -ForegroundColor Cyan -NoNewline
    Write-Host "     - Preview production build"
    Write-ColorOutput "  npm run test" -ForegroundColor Cyan -NoNewline
    Write-Host "        - Run tests"
    Write-ColorOutput "  npm run lint" -ForegroundColor Cyan -NoNewline
    Write-Host "        - Run linter"
    Write-Host ""
    Write-Info "For more information, visit: https://github.com/Imperial-Trade/imperial-trade"
    Write-Host ""
}

# Main installation flow
function Start-Installation {
    Write-Host ""
    Write-ColorOutput @"
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║              IMPERIAL TRADE INSTALLER                     ║
    ║                                                           ║
    ║           Automated Setup & Configuration                 ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Magenta
    Write-Host ""

    # Check prerequisites
    if (-not (Test-Prerequisites)) {
        Write-Error "Prerequisites not met. Please install missing requirements and try again."
        exit 1
    }

    # Determine installation path
    $defaultPath = Join-Path $HOME $ProjectName
    Write-Info "Default installation path: $defaultPath"
    $customPath = Read-Host "Press Enter to use default path, or enter a custom path"

    if ([string]::IsNullOrWhiteSpace($customPath)) {
        $targetPath = $defaultPath
    } else {
        $targetPath = $customPath
    }

    Write-Info "Installing to: $targetPath"
    Write-Host ""

    # Clone/setup repository
    Install-Repository -TargetPath $targetPath

    # Install dependencies
    Install-Dependencies

    # Setup environment
    Initialize-Environment

    # Show next steps
    Show-NextSteps

    # Offer to start dev server
    $response = Read-Host "Would you like to start the development server now? (Y/N)"
    if ($response -eq 'Y' -or $response -eq 'y') {
        Write-Info "Starting development server..."
        Write-Warning "Press Ctrl+C to stop the server"
        Write-Host ""
        npm run dev
    }
}

# Run the installation
try {
    Start-Installation
} catch {
    Write-Error "An unexpected error occurred: $_"
    Write-Info "Please report this issue at: https://github.com/Imperial-Trade/imperial-trade/issues"
    exit 1
}
