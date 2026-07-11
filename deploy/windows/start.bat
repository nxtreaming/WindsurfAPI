@echo off
REM WindsurfAPI first-run bootstrap + foreground supervisor (ASCII only).
REM Delegates to start.ps1 (Chinese text lives there, codepage-immune).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
