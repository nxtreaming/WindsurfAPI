@echo off
REM Pull the latest code via git (interpreted JS is not file-locked, so no need to
REM stop first — just restart afterwards to load new code). Refuses if TRACKED
REM files are dirty; .env / accounts.json / logs are untracked and won't block.
setlocal
cd /d "%~dp0..\.."

where git >nul 2>&1
if errorlevel 1 (
  echo git not found in PATH. Install git or use the dashboard Update button.
  pause
  exit /b 1
)

for /f "delims=" %%i in ('git status --porcelain --untracked-files^=no') do (
  echo Refusing to update: tracked files have uncommitted changes.
  echo   %%i
  echo Commit or stash them first.
  pause
  exit /b 1
)

echo Pulling latest code (fast-forward only)...
git pull --ff-only
if errorlevel 1 (
  echo git pull failed. Resolve manually.
  pause
  exit /b 1
)

echo.
echo Update complete. Restart the gateway to load new code:
echo   restart.bat   (or use the dashboard Update button, which exits 75 to self-restart)
pause
