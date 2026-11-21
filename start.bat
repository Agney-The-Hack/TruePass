@echo off
title TruePass - Unified Biometric Ticketing ^& Quai Network Resale Marketplace
echo ==========================================================
echo   Starting TruePass Unified Master Web Server...
echo   Port: 8080 ^| Entry: index.html
echo ==========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
pause
