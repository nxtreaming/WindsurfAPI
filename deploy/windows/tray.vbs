' WindsurfAPI tray launcher (hidden, no console window). Double-click to run.
' Launches tray.ps1 windowless via wscript so there is no black console box,
' only the system-tray icon. ASCII-only on purpose: .vbs must NOT have a UTF-8
' BOM (wscript rejects it as "Invalid character"), and non-ASCII in a no-BOM vbs
' can misparse under the shell codepage. All Chinese UI text lives in tray.ps1.
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
ps1 = scriptDir & "\tray.ps1"
sh.Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & ps1 & """", 0, False
