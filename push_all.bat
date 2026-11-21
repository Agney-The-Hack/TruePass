@echo off
title Push TruePass Branches to GitHub
cd /d "%~dp0"
echo ==========================================================
echo   Pushing Updated TruePass to GitHub
echo   Repository: https://github.com/Agney-The-Hack/TruePass
echo ==========================================================
echo.

set "GIT_EXE=C:\Users\Agney Sunil\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe"
if not exist "%GIT_EXE%" (
    set "GIT_EXE=C:\Users\Agney Sunil\AppData\Local\GitHubDesktop\app-3.7.0\resources\app\git\cmd\git.exe"
)

echo [1/5] Cleaning any stuck merge state...
"%GIT_EXE%" merge --abort >nul 2>&1

echo [2/5] Committing all latest changes...
"%GIT_EXE%" add .
"%GIT_EXE%" commit -m "feat: updated TruePass account creation and live biometric face scan" >nul 2>&1

echo [3/6] Pushing TruePass-Ticketmaster branch...
"%GIT_EXE%" checkout TruePass-Ticketmaster
"%GIT_EXE%" push origin TruePass-Ticketmaster --force

echo [4/6] Pushing truepass-site branch (Ticketing & Account Portal)...
"%GIT_EXE%" checkout truepass-site
"%GIT_EXE%" merge TruePass-Ticketmaster -m "sync: merge TruePass-Ticketmaster into truepass-site" >nul 2>&1
"%GIT_EXE%" push origin truepass-site --force

echo [5/6] Pushing truepass-guard branch (Security Guard Console)...
"%GIT_EXE%" checkout truepass-guard
"%GIT_EXE%" push origin truepass-guard --force

echo [6/6] Updating and pushing main branch...
"%GIT_EXE%" checkout main
"%GIT_EXE%" reset --hard truepass-site
"%GIT_EXE%" push origin main --force

echo.
echo ==========================================================
echo   ALL BRANCHES PUSHED TO GITHUB SUCCESSFULLY!
echo.
echo   Live Website: https://agney-the-hack.github.io/TruePass/tickets.html
echo   Local Web:    http://localhost:8080/tickets.html
echo ==========================================================
echo.
echo Note: Wait ~60 seconds for GitHub Pages to deploy, then
echo open the link and press Ctrl + F5 to reload.
echo.
pause
