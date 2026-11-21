@echo off
title TruePass - All-in-One Launcher
echo ==========================================================
echo   TruePass Unified Platform + Security Guard Launcher
echo ==========================================================
echo.
echo [1/2] Starting TruePass Master Portal (Port 8080)...
start "TruePass Master Portal" cmd /c "cd /d C:\github\TruePass && start.bat"

timeout /t 2 /nobreak >nul

echo [2/2] Starting TruePass Security Guard Console (Port 8089)...
start "TruePass Security Guard" cmd /c "cd /d C:\github\TruePass-SecurityGuard && start_guard.bat"

timeout /t 2 /nobreak >nul

echo.
echo Launching Web Applications in your browser...
start http://localhost:8080/index.html
start http://localhost:8089/guard.html

echo.
echo ==========================================================
echo   Both services are now running:
echo   - Master Ticketing & Resale Hub: http://localhost:8080/index.html
echo   - Security Guard Gate Software:  http://localhost:8089/guard.html
echo ==========================================================
pause
