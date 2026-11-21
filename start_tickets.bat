@echo off
title TruePass Tickets - FacePass Event Booking
echo Starting TruePass Tickets local web server...
powershell -ExecutionPolicy Bypass -File "%~dp0start_tickets.ps1"
pause
