# PowerShell Script to embed xlsx library into HTML
$htmlFile = "c:\Users\xinxi\Desktop\财务工具\index-new.html"
$xlsxFile = "c:\Users\xinxi\Desktop\财务工具\js\xlsx.full.min.js"
$outputFile = "c:\Users\xinxi\Desktop\财务工具\index-new-standalone.html"

# Read xlsx code
$xlsxCode = Get-Content $xlsxFile -Raw -Encoding UTF8

# Read HTML file
$htmlContent = Get-Content $htmlFile -Raw -Encoding UTF8

# Replace script tag with inline code
$pattern = '<script src="js/xlsx.full.min.js"></script>'
$replacement = "<script>`r`n$xlsxCode`r`n</script>"

$newHtml = $htmlContent -replace [regex]::Escape($pattern), $replacement

# Save to new file
$newHtml | Out-File -FilePath $outputFile -Encoding UTF8 -NoNewline

Write-Host "Done! Created: $outputFile"
Write-Host "File size: $((Get-Item $outputFile).Length / 1KB) KB"
