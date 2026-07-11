@echo off
REM Remove the WindsurfAPI onlogon scheduled task. Does not stop a running instance
REM (use stop.bat for that).
schtasks /delete /tn WindsurfAPI /f
if %ERRORLEVEL%==0 (
  echo Scheduled task WindsurfAPI removed.
) else (
  echo No such task, or removal failed.
)
pause
