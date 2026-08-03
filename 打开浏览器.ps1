$browserPaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Mozilla Firefox\firefox.exe"
)

$targetFile = "c:\Users\surface\Desktop\财务工具\index-complete.html"

foreach ($browser in $browserPaths) {
    if (Test-Path $browser) {
        Write-Host "Using: $browser"
        Start-Process -FilePath $browser -ArgumentList """$targetFile"""
        exit
    }
}

Write-Host "No browser found, trying default..."
Start-Process $targetFile
