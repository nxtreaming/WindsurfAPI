' Launch the WindsurfAPI supervisor loop HIDDEN and DETACHED.
' Window style 0 = hidden; bWaitOnReturn False = don't block.
' Used by install-task.bat (schtasks /onlogon) and run-background.bat.
Dim shell, scriptDir, cmd
Set shell = CreateObject("WScript.Shell")
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
cmd = "powershell -NoProfile -ExecutionPolicy Bypass -File """ & scriptDir & "\run.ps1"""
shell.Run cmd, 0, False
