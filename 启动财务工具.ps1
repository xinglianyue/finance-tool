# 财务工具PowerShell启动脚本
# 解决跨域问题，直接启动浏览器访问

Write-Host "正在启动财务工具..." -ForegroundColor Green

# 检查Python是否安装
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python版本: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "错误: Python未安装" -ForegroundColor Red
    Write-Host "请先安装Python: https://www.python.org/downloads/" -ForegroundColor Yellow
    Read-Host "按Enter键退出"
    exit 1
}

# 启动Python服务器（后台运行）
Write-Host "启动本地服务器..." -ForegroundColor Yellow
$serverProcess = Start-Process python -ArgumentList "start_server.py" -PassThru -WindowStyle Hidden

# 等待服务器启动
Write-Host "等待服务器启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 检查服务器是否启动成功
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000" -TimeoutSec 5
    Write-Host "服务器启动成功！" -ForegroundColor Green
} catch {
    Write-Host "服务器启动失败，请检查端口占用" -ForegroundColor Red
    Read-Host "按Enter键退出"
    exit 1
}

# 启动浏览器并直接访问财务工具
Write-Host "启动浏览器..." -ForegroundColor Yellow
Start-Process "http://localhost:8000/index-v10.html"

Write-Host ""
Write-Host "财务工具已启动！" -ForegroundColor Green
Write-Host "如果浏览器没有自动打开，请手动访问：" -ForegroundColor Yellow
Write-Host "http://localhost:8000/index-v10.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "服务器进程ID: $($serverProcess.Id)" -ForegroundColor Gray
Write-Host "按Ctrl+C停止服务器" -ForegroundColor Yellow

# 等待用户中断
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    # 停止服务器
    Write-Host ""
    Write-Host "正在停止服务器..." -ForegroundColor Yellow
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "服务器已停止" -ForegroundColor Green
}
