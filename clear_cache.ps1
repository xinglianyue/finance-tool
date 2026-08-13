# 强制清空所有缓存的 PowerShell 脚本
param(
    [string]$Token = "[REDACTED_GITHUB]"
)

$repo = "xinglianyue/finance-tool"
$headers = @{
    "Accept" = "application/vnd.github+json"
    "Authorization" = "Bearer $Token"
    "X-GitHub-Api-Version" = "2022-11-28"
}

Write-Host "正在清除 jsDelivr CDN 缓存..."
Invoke-RestMethod -Uri "https://purge.jsdelivr.net/gh/$repo@main/index-new.html" -Method Get | ConvertTo-Json

Write-Host "`n正在触发 GitHub Actions 重建..."
$body = @{ ref = "main" } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/actions/workflows/rebuild-pages.yml/dispatches" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "GitHub Actions 已触发"
} catch {
    Write-Host "GitHub Actions 触发失败: $_"
}

Write-Host "`n请等待 1-2 分钟后测试页面"
