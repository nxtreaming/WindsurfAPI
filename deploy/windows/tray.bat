@echo off
REM WindsurfAPI - launch as a system-tray app (hidden, no console window).
REM Double-click this: a tray icon appears (右键: 打开面板/状态/重启/退出).
REM Delegates to tray.vbs so no black console lingers. ASCII-only by design.
wscript "%~dp0tray.vbs"
