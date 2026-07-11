# 停止 WindsurfAPI(优雅优先)。
# 顺序关键:先杀监督者(powershell/wscript,否则它会立刻重拉 node),再停 node。
# node 先不带 /F(优雅,让 saveAccountsSync + SSE 抽干跑完),超时再 /F 兜底。
$ErrorActionPreference = 'Continue'

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$PidFile = Join-Path $Root 'logs\windsurfapi.pid'

# ── 1. 先结束计划任务(如果用 schtasks 装的),它是监督者的父 ──
schtasks /end /tn WindsurfAPI 2>$null | Out-Null

# ── 2. 杀掉监督循环脚本(否则会重拉 node)──
#   找跑着 run.ps1 的 powershell 进程,以及 run.vbs 的 wscript。
$killedSup = 0
Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='wscript.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
  $cl = $_.CommandLine
  if ($cl -and ($cl -match 'run\.ps1' -or $cl -match 'run\.vbs')) {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop; $killedSup++ } catch { }
  }
}
if ($killedSup -gt 0) { Write-Host "已停止 $killedSup 个监督进程。" -ForegroundColor Yellow }

# ── 3. 优雅停 node ─────────────────────────────────────────
$nodePid = $null
if (Test-Path $PidFile) {
  $nodePid = (Get-Content $PidFile -Raw).Trim()
}

if ($nodePid -and (Get-Process -Id $nodePid -ErrorAction SilentlyContinue)) {
  Write-Host "正在优雅停止 node (pid=$nodePid)..." -ForegroundColor White
  # taskkill 不带 /F = 发送关闭请求;node 的 SIGINT/SIGTERM handler 抽干 + 存盘。
  taskkill /PID $nodePid /T 2>$null | Out-Null
  $waited = 0
  while ((Get-Process -Id $nodePid -ErrorAction SilentlyContinue) -and $waited -lt 8) {
    Start-Sleep -Seconds 1; $waited++
  }
  if (Get-Process -Id $nodePid -ErrorAction SilentlyContinue) {
    Write-Host '优雅停止超时,强制结束(accounts.json 原子写,安全)...' -ForegroundColor Yellow
    taskkill /F /PID $nodePid /T 2>$null | Out-Null
  }
  Write-Host 'node 已停止。' -ForegroundColor Green
} else {
  Write-Host 'pidfile 无有效 node 进程(可能已停)。' -ForegroundColor DarkGray
}

if (Test-Path $PidFile) { Remove-Item $PidFile -Force -ErrorAction SilentlyContinue }
Write-Host 'WindsurfAPI 已停止。' -ForegroundColor Green
