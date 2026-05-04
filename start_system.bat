@echo off
title Smoke Sense - System Startup
color 0A

echo ===================================================
echo    SMOKE SENSE - INTEGRATED SYSTEM STARTUP
echo ===================================================
echo.

:: Start Flask Backend
echo [1/2] Starting Flask Backend Server...
start "Smoke Sense - Backend" cmd /k "cd Backend && python app.py"

:: Start WebSocket Server
echo [2/2] Starting WebSocket Server...
start "Smoke Sense - WebSocket" cmd /k "cd "Websocket Server" && npm start"

echo.
echo ===================================================
echo    SYSTEMS ARE STARTING IN SEPARATE WINDOWS
echo ===================================================
echo.
pause
