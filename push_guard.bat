@echo off
title Push truepass-guard to GitHub
echo ==========================================================
echo   Pushing branch 'truepass-guard' to GitHub
echo   Repository: https://github.com/Agney-The-Hack/TruePass
echo ==========================================================
echo.

set "GIT_EXE=C:\Users\Agney Sunil\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe"
if not exist "%GIT_EXE%" (
    set "GIT_EXE=C:\Users\Agney Sunil\AppData\Local\GitHubDesktop\app-3.7.0\resources\app\git\cmd\git.exe"
)

"%GIT_EXE%" push -u origin truepass-guard

echo.
echo ==========================================================
echo   If prompted, sign in via browser to authorize GitHub.
echo   Branch URL: https://github.com/Agney-The-Hack/TruePass/tree/truepass-guard
echo ==========================================================
pause
