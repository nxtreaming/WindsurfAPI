@echo off
REM Register the onlogon scheduled task for hidden autostart.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-task.ps1"
pause
