@echo off
title TruePass Backend Server - Privacy Biometric Commitments
echo ==========================================================
echo   Starting TruePass TypeScript Backend Server...
echo ==========================================================
set PATH=C:\Users\Agney Sunil\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\Agney Sunil\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;%PATH%
cd /d "%~dp0"
node dist/src/index.js
pause
