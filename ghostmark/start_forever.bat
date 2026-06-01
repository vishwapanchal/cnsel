@echo off
echo ========================================
echo    GhostMark - Starting Servers Forever
echo ========================================
echo.

echo [1/2] Starting Backend Server (Auto-Restart Mode)...
:: We use an infinite for loop (for /l) to restart the server automatically if it exits.
start cmd /k "cd backend && for /L %%i in (0,0,1) do (echo Starting Backend... && venv\Scripts\python.exe main.py && echo Backend crashed! Restarting in 3 seconds... && timeout /t 3 /nobreak > nul)"

echo [2/2] Starting Frontend Server (Auto-Restart Mode)...
start cmd /k "cd frontend && for /L %%i in (0,0,1) do (echo Starting Frontend... && npm run dev && echo Frontend crashed! Restarting in 3 seconds... && timeout /t 3 /nobreak > nul)"

echo.
echo ========================================
echo    GhostMark is running permanently!
echo ========================================
echo.
echo The servers will automatically restart if they crash.
echo You can safely close this window. The servers run in the newly opened windows.
echo.
pause > nul
