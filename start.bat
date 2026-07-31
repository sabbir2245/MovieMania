@echo off
title MovieMania Launcher
setlocal

REM --- Always run from the project root, no matter where the script is launched ---
cd /d "%~dp0"

echo =============================================
echo    MovieMania - Launcher
echo =============================================

REM --- 1. Check Node.js / npm are installed ---
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Download it from https://nodejs.org then try again.
    pause
    exit /b 1
)
echo [OK] Node found: 
node -v

REM --- 2. Install root dependencies if missing ---
if exist "node_modules" (
    echo [OK] Root dependencies already installed.
) else (
    echo [..] Installing root dependencies...
    call npm install
    if errorlevel 1 ( echo [ERROR] npm install failed. & pause & exit /b 1 )
)

REM --- 3. Install frontend dependencies if missing ---
if exist "front\node_modules" (
    echo [OK] Frontend dependencies already installed.
) else (
    echo [..] Installing frontend dependencies...
    pushd front
    call npm install
    popd
    if errorlevel 1 ( echo [ERROR] frontend npm install failed. & pause & exit /b 1 )
)

REM --- 4. Start backend (:3000) + frontend (:5001) together ---
echo.
echo Starting servers... backend on :3000, frontend on :5001
echo Press Ctrl+C in this window to stop everything.
echo.
start "" cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:5001"
call npm start

pause
