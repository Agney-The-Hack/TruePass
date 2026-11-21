@echo off
title Facial Recognition Server
echo ========================================================
echo   Launching Facial Recognition Web Application...
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_server.ps1"
pause

