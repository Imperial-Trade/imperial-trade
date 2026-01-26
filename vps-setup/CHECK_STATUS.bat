@echo off
echo ========================================
echo SYSTEM STATUS CHECK
echo ========================================
echo.

echo FILES:
if exist "C:\vps-broker-service\vps-setup\RUN_THIS_NOW.ps1" (echo   OK: RUN_THIS_NOW.ps1) else (echo   MISSING: RUN_THIS_NOW.ps1)
if exist "C:\vps-broker-service\dist\index.js" (echo   OK: index.js) else (echo   MISSING: index.js)
if exist "C:\MT5_BrokerService\terminal64.exe" (echo   OK: MT5 terminal64.exe) else (echo   MISSING: MT5 terminal64.exe)

echo.
echo PM2:
pm2 status

echo.
echo PORT 3001:
netstat -an | findstr ":3001"

echo.
echo MT5 PROCESS:
tasklist | findstr "terminal64.exe"

echo.
echo ========================================
echo CHECK COMPLETE
echo ========================================
