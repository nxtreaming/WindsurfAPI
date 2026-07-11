@echo off
REM One-shot HIDDEN background launch (no scheduled task, does NOT survive reboot).
REM For persistent boot-time autostart use install-task.bat instead.
if not exist "%~dp0..\..\.env" (
  echo .env not found at project root. Run start.bat first to bootstrap.
  pause
  exit /b 1
)
wscript "%~dp0run.vbs"
echo WindsurfAPI launched in the background (hidden). Use status.bat to check, stop.bat to stop.
