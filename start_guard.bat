@echo off
title TruePass Guard - Gate Security Console
echo Starting TruePass Guard Portal local web server...
powershell -ExecutionPolicy Bypass -File "%~dp0start_guard.ps1"
pause
