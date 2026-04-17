<#
.SYNOPSIS
  OctoPoster 后端服务热重启脚本
  
.DESCRIPTION
  1. 根据指定的窗口标题，关闭之前由该脚本打开的旧 PowerShell 窗口。
  2. 深度扫描并清理可能占用目标端口 (12399) 的残留进程，确保 `go run` 不会因端口冲突而失败。
  3. 启动一个全新的独立 PowerShell 窗口来运行服务，并重新赋予特定标题，方便下次精准关闭。
#>

$ErrorActionPreference = "SilentlyContinue"
$Port = 12399
$WindowTitle = "OctoPoster-Backend-Server"

Write-Host "🔄 正在准备重启 OctoPoster 服务..." -ForegroundColor Cyan

# 1. 根据窗口标题关闭之前的独立 PowerShell 窗口
$oldWindows = Get-Process | Where-Object { $_.MainWindowTitle -match $WindowTitle -and $_.Name -match "powershell|pwsh|WindowsTerminal" }
if ($oldWindows) {
    Write-Host "关闭旧的控制台窗口..." -ForegroundColor Yellow
    $oldWindows | Stop-Process -Force
    Start-Sleep -Seconds 1
}

# 2. 检查并终止仍然占用目标端口的残留进程 (非常重要，兜底清理旧的 go.exe/server.exe)
$connections = Get-NetTCPConnection -LocalPort $Port -State Listen
if ($connections) {
    foreach ($conn in $connections) {
        $pidToKill = $conn.OwningProcess
        if ($pidToKill -ne 0 -and $pidToKill -ne $PID) {
            $proc = Get-Process -Id $pidToKill
            if ($proc) {
                Write-Host "终止占用端口 $Port 的残留进程: $($proc.ProcessName) (PID: $pidToKill)..." -ForegroundColor Red
                Stop-Process -Id $pidToKill -Force
                Start-Sleep -Seconds 1
            }
        }
    }
}

Write-Host "✨ 清理完成，正在启动新服务..." -ForegroundColor Green

# 3. 确定项目根目录 (当前脚本所在目录)
$scriptDir = $PSScriptRoot
if ([string]::IsNullOrEmpty($scriptDir)) {
    $scriptDir = (Get-Location).Path
}

# 4. 在全新的独立 PowerShell 窗口中启动服务，并设定固定标题
$startArgs = "-NoExit -Command `" `
    `$Host.UI.RawUI.WindowTitle = '$WindowTitle'; `
    Set-Location -Path '$scriptDir'; `
    Write-Host '🚀 正在启动 OctoPoster Server (因采用了热重启脚本，此窗口后续会被自动更新/关闭)...' -ForegroundColor Green; `
    echo '========================================='; `
    go run ./cmd/server `" "

Start-Process powershell -ArgumentList $startArgs

Write-Host "✅ 重启成功！新的服务控制台已在独立窗口中打开。" -ForegroundColor Green
Start-Sleep -Seconds 2
