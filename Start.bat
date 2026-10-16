@echo off
cd /d "%~dp0"
title Hesabdari

echo.
echo  ========================================
echo   Hesabdari - Easy Start
echo  ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  [!] Node.js is not installed.
  echo      Opening download page...
  echo      Install LTS, then run this file again.
  echo.
  start https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo  [1/2] First-time install... please wait
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo  [!] npm install failed. Check internet and retry.
    pause
    exit /b 1
  )
  echo.
)

echo  [2/2] Starting...
echo.
echo  ----------------------------------------
echo   PC:     http://localhost:3000
echo.
echo   Phone (same WiFi):
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  for /f "tokens=*" %%b in ("%%a") do echo           http://%%b:3000
)
echo  ----------------------------------------
echo.
echo  To stop: close this window  (or Ctrl+C)
echo.

timeout /t 2 /nobreak >nul
start "" http://localhost:3000

call npm run dev:lan
pause
