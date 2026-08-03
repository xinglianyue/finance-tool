Add-Type -AssemblyName Microsoft.Office.Interop.Word
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open("C:\Users\surface\Desktop\财务分析讨论.docx")
$text = $doc.Content.Text
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
$text | Out-File -FilePath "C:\Users\surface\Desktop\财务工具\docs\财务分析讨论内容.txt" -Encoding UTF8
Write-Host "Done - Text extracted successfully"
