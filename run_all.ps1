# TruePass All-in-One Launcher for PowerShell
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  TruePass Unified Platform + Security Guard Launcher" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Starting TruePass Master Portal (Port 8080)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File 'C:\github\TruePass\start.ps1'"

Start-Sleep -Seconds 2

Write-Host "[2/2] Starting TruePass Security Guard Console (Port 8089)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File 'C:\github\TruePass-SecurityGuard\start_guard.ps1'"

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Opening portals in default browser..." -ForegroundColor Green
Start-Process "http://localhost:8080/index.html"
Start-Process "http://localhost:8089/guard.html"

Write-Host ""
Write-Host "Both portals are online:" -ForegroundColor Green
Write-Host "  - Master Portal: http://localhost:8080/index.html" -ForegroundColor White
Write-Host "  - Security Guard Software: http://localhost:8089/guard.html" -ForegroundColor White
