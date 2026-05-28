# 财务工具启动器 - PowerShell HTTP 服务器
$ErrorActionPreference = "Stop"

$projectDir = "C:\Users\surface\Desktop\财务工具"
$port = 8888

# 停止可能已经运行的服务器
Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object { 
    $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    if ($proc) { 
        Write-Host "停止旧进程..." 
        Stop-Process -Id $_.OwningProcess -Force 
    }
}

Write-Host "========================================"
Write-Host "  财务分析工具 - HTTP 服务器"
Write-Host "========================================"
Write-Host ""
Write-Host "正在启动服务器..."
Write-Host ""

# 创建 HttpListener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")

try {
    $listener.Start()
    Write-Host "✅ 服务器已启动!" -ForegroundColor Green
    Write-Host ""
    Write-Host "请在浏览器中打开:" -ForegroundColor Yellow
    Write-Host "  http://localhost:$port/index-bundle.html" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "按 Ctrl+C 停止服务器"
    Write-Host ""
    
    # 打开浏览器
    Start-Process "http://localhost:$port/index-bundle.html"
    
    # 处理请求
    while ($listener.IsListening) {
        $context = $listener.GetContextContext.Request.Url.AbsolutePath
            $context = $listener.GetContext().Request.Url.AbsolutePath
        
        if ($context -eq "/" -or $context -eq "") {
            $context = "/index-bundle.html"
        }
        
        $filePath = Join-Path $projectDir $context.TrimStart("/")
        
        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath)
            $contentTypes = @{
                ".html" = "text/html; charset=utf-8"
                ".css" = "text/css"
                ".js" = "application/javascript"
                ".json" = "application/json"
                ".png" = "image/png"
                ".jpg" = "image/jpeg"
            }
            
            try {
                $content = [System.IO.File]::ReadAllBytes($filePath)
                $context.Response.ContentType = $contentTypes[$ext]
                if (!$contentTypes[$ext]) {
                    $context.Response.ContentType = "application/octet-stream"
                }
                $context.Response.OutputStream.Write($content, 0, $content.Length)
            } catch {
                $context.Response.StatusCode = 500
            }
        } else {
            $context.Response.StatusCode = 404
            $errorHtml = "<html><body><h1>404 - File Not Found</h1><p>$context</p></body></html>"
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($errorHtml)
            $context.Response.ContentType = "text/html"
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        
        $context.Response.Close()
    }
} catch {
    Write-Host "错误: $_" -ForegroundColor Red
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
}
