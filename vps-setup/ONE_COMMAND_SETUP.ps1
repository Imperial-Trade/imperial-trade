# ============================================================================
# ONE-COMMAND SETUP - Execute This Single Line in VPS PowerShell
# ============================================================================
# This script downloads and executes everything automatically
# Run this ONE command in PowerShell as Administrator:
# 
# Invoke-WebRequest -Uri "https://raw.githubusercontent.com/your-repo/main/vps-setup/RUN_ALL_ON_VPS.ps1" -UseBasicParsing | Select-Object -ExpandProperty Content | powershell -NoProfile -ExecutionPolicy Bypass
#
# OR if you have the script locally, just run:
# .\RUN_ALL_ON_VPS.ps1
# ============================================================================

# ============================================================================
# ALTERNATIVE: One-Liner to Execute Entire Setup
# ============================================================================
# Copy this entire block and paste into VPS PowerShell (as Administrator):

# ONE-LINER VERSION (Copy everything below this line):
$ErrorActionPreference = 'Continue'; $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator); if (-not $isAdmin) { Write-Host "❌ Must run as Administrator!" -ForegroundColor Red; exit 1 }; Write-Host "Starting automated setup..." -ForegroundColor Cyan; Set-ExecutionPolicy Bypass -Scope Process -Force; if (-not (Get-Command choco -ErrorAction SilentlyContinue)) { iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1')); refreshenv }; if (-not (Get-Command node -ErrorAction SilentlyContinue)) { choco install nodejs-lts -y | Out-Null; refreshenv }; if (-not (Get-Command python -ErrorAction SilentlyContinue)) { choco install python3 -y | Out-Null; refreshenv }; python -m pip install --upgrade pip --quiet | Out-Null; python -m pip install MetaTrader5 requests python-dotenv --quiet | Out-Null; if (-not (Get-Command deno -ErrorAction SilentlyContinue)) { irm https://deno.land/install.ps1 | iex; $denoPath = "$env:USERPROFILE\.deno\bin"; if ($env:PATH -notlike "*$denoPath*") { [Environment]::SetEnvironmentVariable("Path", "$env:Path;$denoPath", [EnvironmentVariableTarget]::Machine); $env:Path += ";$denoPath" } }; if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) { npm install -g pm2 | Out-Null }; pm2 startup | Out-Null; if (-not (Get-Command git -ErrorAction SilentlyContinue)) { choco install git -y | Out-Null; refreshenv }; Write-Host "✅ All runtime environments installed!" -ForegroundColor Green; Write-Host "✅ Setup complete! Services configured to auto-start on boot." -ForegroundColor Green

# ============================================================================
# NOTE: The one-liner above installs runtime environments only
# For complete setup with watchdogs and services, use RUN_ALL_ON_VPS.ps1
# ============================================================================




