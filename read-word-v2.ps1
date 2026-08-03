$docxPath = "C:\Users\surface\Desktop\财务分析讨论.docx"
$extractPath = "$env:TEMP\docx_extract"

if (Test-Path $extractPath) {
    Remove-Item $extractPath -Recurse -Force
}
New-Item -ItemType Directory -Path $extractPath -Force | Out-Null

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($docxPath, $extractPath)

$xmlPath = Join-Path $extractPath "word\document.xml"
if (Test-Path $xmlPath) {
    $xmlContent = Get-Content $xmlPath -Raw -Encoding UTF8
    
    $ns = @{w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    
    [xml]$xml = $xmlContent
    
    $textNodes = $xml.SelectNodes("//w:t", $ns)
    
    $result = ""
    foreach ($node in $textNodes) {
        $result += $node.InnerText
    }
    
    $result = $result -replace '\s+', ' '
    
    Write-Output $result
    Write-Output "`n`nSaved to: C:\Users\surface\Desktop\财务工具\docs\财务分析讨论内容.txt"
    
    $result | Out-File -FilePath "C:\Users\surface\Desktop\财务工具\docs\财务分析讨论内容.txt" -Encoding UTF8
} else {
    Write-Output "document.xml not found in docx"
}

Remove-Item $extractPath -Recurse -Force
