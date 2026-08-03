# Simple HTTP Server in PowerShell
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()

Write-Host "Server started at http://localhost:8080/"
Write-Host "Press Ctrl+C to stop the server"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    $url = $request.Url.LocalPath
    if ($url -eq "/") { $url = "/index-bundle.html" }
    
    $filePath = Join-Path $PSScriptRoot $url.TrimStart("/")
    
    if (Test-Path $filePath -PathType Leaf) {
        $content = [System.IO.File]::ReadAllBytes($filePath)
        $extension = [System.IO.Path]::GetExtension($filePath)
        
        $mimeTypes = @{
            ".html" = "text/html; charset=utf-8"
            ".css" = "text/css; charset=utf-8"
            ".js" = "application/javascript; charset=utf-8"
            ".json" = "application/json; charset=utf-8"
            ".png" = "image/png"
            ".jpg" = "image/jpeg"
            ".gif" = "image/gif"
            ".svg" = "image/svg+xml"
            ".ico" = "image/x-icon"
        }
        
        $response.ContentType = $mimeTypes[$extension]
        if (-not $response.ContentType) { $response.ContentType = "application/octet-stream" }
        
        $response.ContentLength64 = $content.Length
        $response.OutputStream.Write($content, 0, $content.Length)
    } else {
        $response.StatusCode = 404
        $response.Close()
        continue
    }
    
    $response.Close()
}

$listener.Stop()
