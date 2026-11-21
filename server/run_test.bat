@echo off
title TruePass Biometric Commitment Test Runner
echo ==========================================================
echo   Running TruePass Privacy & Biometric Test Suite...
echo ==========================================================
set PATH=C:\Users\Agney Sunil\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\Agney Sunil\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;%PATH%
cd /d "%~dp0"
node dist/tests/commitment.test.js || pnpm test
pause
