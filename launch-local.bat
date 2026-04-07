@echo off
:: ─────────────────────────────────────────────────────────────────
:: Sprout Calculator — Local Launcher
:: Double-click this file to start the app in your browser.
:: ─────────────────────────────────────────────────────────────────

:: Move to the folder this .bat file lives in (the project root)
cd /d "%~dp0"

:: Check Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Node.js is not installed.
    echo.
    echo  Please install it from: https://nodejs.org
    echo  Choose the LTS version, install it, then try again.
    echo.
    pause
    exit /b 1
)

:: Start the server in a new window so it stays running
start "Sprout Calculator Server" cmd /c "node server.js & pause"

:: Give the server a moment to start
timeout /t 2 /nobreak >nul

:: Open the browser
start http://localhost:3000

echo.
echo  Sprout Calculator is starting...
echo  It should open in your browser automatically.
echo.
echo  If it does not open, go to: http://localhost:3000
echo.
echo  To stop the server, close the other terminal window.
echo.
exit /b 0
