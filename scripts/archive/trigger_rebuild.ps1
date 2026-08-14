$token = "[REDACTED_GITHUB]"
$headers = @{
    "Accept" = "application/vnd.github+json"
    "Authorization" = "Bearer $token"
    "X-GitHub-Api-Version" = "2022-11-28"
}
$body = @{
    ref = "main"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/xinglianyue/finance-tool/actions/workflows/rebuild-pages.yml/dispatches" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "Success: Workflow dispatch triggered"
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "Error: $_"
    Write-Host $_.Exception.Response.StatusCode.Value__
    Write-Host $_.ErrorDetails.Message
}
