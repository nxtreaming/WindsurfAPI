# 生成 windsurfapi.ico —— 纯 .NET System.Drawing 画 Windsurf 的 W 波浪标志,
# 零依赖(无需 SVG 转换工具)。圆头粗笔画走 5 个点(下-上-下-上-下 的 W/波浪),
# 多尺寸(16/24/32/48/64/128/256)打进一个 .ico。托盘图标偏小,用深色描边 +
# 透明底,浅色任务栏也清晰。
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$OutIco = Join-Path $PSScriptRoot 'windsurfapi.ico'
$sizes = @(16, 24, 32, 48, 64, 128, 256)

# 对照参考图的 Windsurf 波浪(不对称,非字母 W):左侧一道陡长斜线从高处下探到
# 第一个圆谷 → 升到中间高峰 → 再下探到第二个圆谷 → 右侧短促上翘收尾。右峰比中峰
# 矮、更靠右上,整体像流动水波而非对称字母。y 越大越靠下。
$pts = @(
  [System.Drawing.PointF]::new(210, 380),   # 左上起点(高)
  [System.Drawing.PointF]::new(430, 760),   # 第一个谷(圆底,长斜线下探)
  [System.Drawing.PointF]::new(545, 400),   # 中间高峰(圆顶)
  [System.Drawing.PointF]::new(730, 740),   # 第二个谷
  [System.Drawing.PointF]::new(800, 470)    # 右侧短上翘收尾(比中峰矮,收在画布内)
)

function New-WBitmap([int]$px, [System.Drawing.Color]$color) {
  $bmp = New-Object System.Drawing.Bitmap($px, $px, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)
  # 逻辑 1000 → 像素 px 的缩放
  $s = $px / 1000.0
  $scaled = $pts | ForEach-Object { [System.Drawing.PointF]::new($_.X * $s, $_.Y * $s) }
  # 笔画宽度 ~ 图标的 19%,圆头圆角(留边距防截断)
  $penW = [float]($px * 0.19)
  $pen = New-Object System.Drawing.Pen($color, $penW)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $g.DrawLines($pen, [System.Drawing.PointF[]]$scaled)
  $pen.Dispose(); $g.Dispose()
  return $bmp
}

# 用深色(与参考图一致的近黑)。托盘/任务栏多为浅底,深色最清晰。
$col = [System.Drawing.Color]::FromArgb(255, 17, 17, 17)

# 每个尺寸渲染成 PNG 字节(现代 .ico 支持内嵌 PNG,大尺寸最省且无色深问题)。
$pngs = @()
foreach ($px in $sizes) {
  $bmp = New-WBitmap $px $col
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $pngs += ,($ms.ToArray())
  $bmp.Dispose(); $ms.Dispose()
}

# ── 手写 .ico 容器 ──
# ICONDIR(6) + N × ICONDIRENTRY(16) + 各 PNG 数据。
$fs = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([uint16]0)      # reserved
$bw.Write([uint16]1)      # type = 1 (icon)
$bw.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $px = $sizes[$i]
  $len = $pngs[$i].Length
  $bw.Write([byte]($(if ($px -ge 256) { 0 } else { $px })))  # width (0 = 256)
  $bw.Write([byte]($(if ($px -ge 256) { 0 } else { $px })))  # height
  $bw.Write([byte]0)       # color count
  $bw.Write([byte]0)       # reserved
  $bw.Write([uint16]1)     # color planes
  $bw.Write([uint16]32)    # bits per pixel
  $bw.Write([uint32]$len)  # bytes of image data
  $bw.Write([uint32]$offset)
  $offset += $len
}
foreach ($png in $pngs) { $bw.Write($png) }
$bw.Flush()
[System.IO.File]::WriteAllBytes($OutIco, $fs.ToArray())
$bw.Dispose(); $fs.Dispose()

# 校验:重新加载确认是合法 .ico。
$check = New-Object System.Drawing.Icon($OutIco)
Write-Host ("已生成 " + $OutIco + " (" + $sizes.Count + " 尺寸, " + (Get-Item $OutIco).Length + " 字节, 加载 OK: " + $check.Width + "x" + $check.Height + ")")
$check.Dispose()

