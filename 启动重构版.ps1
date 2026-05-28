# 财务工具启动脚本
Write-Host "========================================"
Write-Host "  财务分析工具 v17 - 重构版"
Write-Host "========================================"
Write-Host ""

$port = 8889
$projectDir = "c:\Users\xinxi\Desktop\财务工具"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")

$listener.Start()
Write-Host "✅ 服务器已启动!" -ForegroundColor Green
Write-Host ""
Write-Host "请在浏览器中打开:" -ForegroundColor Yellow
Write-Host "  http://localhost:$port/index.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "按 Ctrl+C 停止服务器"
Write-Host ""

Start-Process "http://localhost:$port/index.html"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $urlPath = $context.Request.Url.AbsolutePath
    
    if ($urlPath -eq "/" -or $urlPath -eq "") {
        $urlPath = "/index.html"
    }
    
    $filePath = Join-Path $projectDir $urlPath.TrimStart("/")
    
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
        
        $content = [System.IO.File]::ReadAllBytes($filePath)
        $context.Response.ContentType = $contentTypes[$ext]
        if (-not $contentTypes[$ext]) {
            $context.Response.ContentType = "application/octet-stream"
        }
        $context.Response.OutputStream.Write($content, 0, $content.Length)
    } else {
        $context.Response.StatusCode = 404
        $errorHtml = "<html><body><h1>404 - File Not Found</h1><p>$urlPath</p></body></html>"
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($errorHtml)
        $context.Response.ContentType = "text/html"
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    
    $context.Response.Close()
}

$listener.Stop()
$listener.Close()
