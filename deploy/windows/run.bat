@echo off
REM Run the supervisor loop in the foreground when .env already exists.
REM If .env is missing, point the user at start.bat for first-run bootstrap.
if not exist "%~dp0..\..\.env" (
  echo .env not found at project root. Run start.bat first to bootstrap.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
