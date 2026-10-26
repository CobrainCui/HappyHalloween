@echo off
setlocal
cd /d "%~dp0"
title Pumpkin Hollow

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   [!] Node.js is not installed.
  echo.
  echo   1. Install Node.js 18 or newer from https://nodejs.org
  echo   2. Run this file again.
  echo.
  pause
  exit /b 1
)

echo.
echo   Starting Pumpkin Hollow ...
echo   Local address: http://127.0.0.1:4173
echo   Close this window to stop the server.
echo.

start "Pumpkin Hollow Server" cmd /k node server.js
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:4173
