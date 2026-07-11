@echo off
REM Stop then relaunch in the background.
call "%~dp0stop.bat"
timeout /t 2 /nobreak >nul
call "%~dp0run-background.bat"
