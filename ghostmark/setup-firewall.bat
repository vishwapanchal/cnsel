@echo off
echo ========================================
echo    GhostMark - Firewall Setup
echo ========================================
echo.
echo This script will add firewall rules to allow network access.
echo Please run this as Administrator!
echo.
pause

netsh advfirewall firewall add rule name="GhostMark Frontend" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="GhostMark Backend" dir=in action=allow protocol=TCP localport=8000

echo.
echo ========================================
echo    Firewall rules added successfully!
echo ========================================
echo.
echo You can now access GhostMark from other devices:
echo   Frontend: http://10.225.12.75:3000
echo   Backend:  http://10.225.12.75:8000
echo.
pause
