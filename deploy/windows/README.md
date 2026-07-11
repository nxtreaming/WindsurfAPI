# WindsurfAPI — Windows 后台运行

零依赖(纯 `schtasks` + `wscript` + PowerShell)把网关在 Windows 上以隐藏后台、开机自启、崩溃自愈的方式跑起来。不碰 `src/`,只是外挂启动/监督层。

## 快速开始

1. **首次引导**:双击 `start.bat`。它会:
   - 校验 Node ≥ 20
   - 幂等生成项目根 `.env`(UTF-8 无 BOM),填缺失键:`PORT=3003`、`HOST=127.0.0.1`、强随机 `API_KEY` / `DASHBOARD_PASSWORD`、`DEVIN_CONNECT=1`
   - 打印两把密钥 + 面板地址 `http://127.0.0.1:3003/dashboard`
   - 进入前台监督循环(可 Ctrl-C 优雅停,最利首次调试)
2. **登录面板**:浏览器开 `http://127.0.0.1:3003/dashboard`,用打印出的 `DASHBOARD_PASSWORD` 登录,到 accounts 页加一个 Windsurf/Devin session token。
3. **装成开机自启后台**:`install-task.bat`(注册登录时计划任务,隐藏分离进程)。之后 `status.bat` 看状态,`stop.bat` 停,`uninstall-task.bat` 卸。

## 脚本清单

| 脚本 | 作用 |
|---|---|
| `start.bat` / `start.ps1` | 首次引导(生成 `.env`+密钥)+ 前台监督循环 |
| `run.ps1` | 监督循环内核(退出码路由 + pidfile + 日志 Tee) |
| `run.bat` | 已有 `.env`,直接跑前台监督循环 |
| `run-background.bat` / `run.vbs` | 一次性隐藏后台(不注册任务,不跨重启) |
| `install-task.bat` / `install-task.ps1` | 注册开机自启计划任务(主后台方案) |
| `uninstall-task.bat` | 移除计划任务 |
| `stop.bat` / `stop.ps1` | 停机(优雅优先,超时 `/F` 兜底) |
| `status.bat` / `status.ps1` | 状态(RUNNING/STOPPED + PID + 端口 + 日志尾) |
| `restart.bat` | 重启 |
| `update.bat` | `git pull --ff-only` 拉新码(解释执行不锁文件,无需先停) |

## 退出码语义(⚠️ 与 KiroStudio 相反)

| 退出码 | 含义 | 监督动作 |
|---|---|---|
| **75** | 自更新/面板 Update 请求重启(`EX_TEMPFAIL`) | 重启,重置崩溃计数 |
| **0** | 优雅停机(Ctrl-C/SIGTERM,已抽干 SSE + 存盘) | 短暂可打断等待后重启(真实 Ctrl-C 会同时终结监督者,走不到重拉) |
| **1**/其它 | 崩溃 / 启动抛错 / 端口占用重试耗尽 | 退避重启,连续 5 次后红框停机打印日志尾 |

不可照抄 KS 的「0=重启」循环——WS 里 **75** 才是「请重启我」信号,漏接会让面板 Update 按钮卡死。

## Windows 特有注意

- **`.env` 用 UTF-8 无 BOM 写**(`start.ps1` 用 `UTF8Encoding($false)`)。`config.js` 的 `.trim()` 恰好能剥掉首键 BOM,但仍以无 BOM 为准。`.bat` 全 ASCII,中文只在 `.ps1`。
- **必须 `HOST=127.0.0.1`**:默认 `0.0.0.0` + 空 `API_KEY` = fail-closed 锁死(看似起来了实则 401)。
- **必须 `DEVIN_CONNECT=1`**:language_server 仅 Linux/macOS;不设则面板能开但每个 completion 静默失败。
- **`accounts.json` 原子写**:`taskkill /F` 不会截断它(tmp+rename),但优雅停更好(刷新池态 + 抽干在途)。监督者**阻塞等子进程完全退出再重启**,绝不用 `/F` 来「重启」。
