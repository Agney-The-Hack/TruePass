@echo off
title TruePass FastTrack Onboarding - Supabase Cloud Sync
echo Starting TruePass FastTrack Onboarding local web server...
powershell -ExecutionPolicy Bypass -File "%~dp0start_onboarding.ps1"
pause
