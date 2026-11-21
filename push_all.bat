@echo off
title Push TruePass Branches to GitHub
echo ==========================================================
echo   Pushing all branches to GitHub:
echo   - main (Default repository branch)
echo   - truepass-site (Main Ticketing site branch)
echo   - truepass-guard (Gate Security scanner branch)
echo   Repository: https://github.com/Agney-The-Hack/TruePass
echo ==========================================================
echo.

set "GIT_EXE=C:\Users\Agney Sunil\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe"
if not exist "%GIT_EXE%" (
    set "GIT_EXE=C:\Users\Agney Sunil\AppData\Local\GitHubDesktop\app-3.7.0\resources\app\git\cmd\git.exe"
)

echo Pushing main branch...
"%GIT_EXE%" push origin main
echo.

echo Pushing truepass-site branch...
"%GIT_EXE%" push origin truepass-site
echo.

echo Pushing truepass-guard branch...
"%GIT_EXE%" push origin truepass-guard
echo.

echo ==========================================================
echo   Push complete!
echo   Main Website: https://agney-the-hack.github.io/TruePass/tickets.html
echo   Repository:   https://github.com/Agney-The-Hack/TruePass
echo ==========================================================
pause
