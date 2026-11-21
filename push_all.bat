@echo off
title Push TruePass Branches to GitHub
echo ==========================================================
echo   Pushing branches to GitHub:
echo   - truepass-guard
echo   - truepass-site
echo   Repository: https://github.com/Agney-The-Hack/TruePass
echo ==========================================================
echo.

set "GIT_EXE=C:\Users\Agney Sunil\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe"
if not exist "%GIT_EXE%" (
    set "GIT_EXE=C:\Users\Agney Sunil\AppData\Local\GitHubDesktop\app-3.7.0\resources\app\git\cmd\git.exe"
)

echo Pushing truepass-guard...
"%GIT_EXE%" push origin truepass-guard
echo.

echo Pushing truepass-site...
"%GIT_EXE%" push origin truepass-site
echo.

echo ==========================================================
echo   Push complete!
echo   Guard Branch: https://github.com/Agney-The-Hack/TruePass/tree/truepass-guard
echo   Site Branch:  https://github.com/Agney-The-Hack/TruePass/tree/truepass-site
echo ==========================================================
pause
