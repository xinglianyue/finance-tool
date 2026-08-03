# Build script in PowerShell (replacement for build-no-vite.py)
param([switch]$NoData)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "=== 构建财务工具 v17 (PowerShell 版本) ===" -ForegroundColor Cyan

# Configuration
$jsDir = Join-Path $scriptDir "js"
$cssDir = Join-Path $scriptDir "css"
$devHtml = Join-Path $scriptDir "index-dev.html"
$preloadedData = Join-Path $scriptDir "preloaded_data.json"
$deployDir = "C:\Users\surface\finance-tool-deploy"

$jsOrder = @(
    "core.js", "utils.js", "charts.js", "parser.js", "kpi.js", "insights.js",
    "ui.js", "analysis.js", "overview.js", "detail.js", "cost.js", "export.js",
    "sync.js", "report.js", "theme.js", "file.js", "app.js", "validate.js"
)

$cdnScripts = @"
<script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
"@

# Function to strip module syntax
function Strip-ModuleSyntax {
    param([string]$code)
    $code = $code -replace """import\s*\{\s*Chart\s*,\s*registerables\s*\}\s*from\s*'chart\.js'\s*;?"""
    $code = $code -replace """import\s+'chartjs-plugin-datalabels'\s*;?"""
    $code = $code -replace """import\s+\*\s+as\s+XLSX\s+from\s*'xlsx'\s*;?"""
    $code = $code -replace """import\s+\{[^}]*\}\s+from\s+'\./[^']+';?"""
    $code = $code -replace """import\s+\{[^}]*\}\s+from\s+"""\./[^""]+""";?"""
    $code = $code -replace """import\s+.*?from\s+['""][^'""]+['""];?"""
    $code = $code -replace """import\s+['""][^'""]+['""];?"""
    $code = $code -replace """export\s*\{[^}]*\};?"""
    $code = $code -replace """export\s+(function|const|var|let|class)\s+""", "`$1 "
    $code = $code -replace """export\s+default\s+""", ""
    return $code
}

# Read index-dev.html
Write-Host "  [读取] index-dev.html" -ForegroundColor Yellow
$html = Get-Content -Path $devHtml -Raw -Encoding UTF8

# Cleanup HTML - remove existing module scripts
$html = $html -replace """\s*<script\s+src=""https://cdn\.jsdelivr\.net/[^""]*""></script>""", ""
$html = $html -replace """\s*<script\s+type=""module""[^>]*></script>""", ""
$html = $html -replace """<script\s+type=""module""[^>]*>.*?</script>""", ""

# Build JavaScript bundle
Write-Host "  [拼接] JavaScript 模块" -ForegroundColor Yellow
$jsParts = @()
$jsParts += "// ===== 财务工具 v17 (PowerShell build) ====="
$jsParts += "// 构建: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
$jsParts += @"
var Chart;
if (typeof window.Chart !== 'undefined') {
  Chart = window.Chart;
} else {
  console.warn('[init] Chart.js CDN未加载，图表功能不可用');
  Chart = function(ctx, config) { this.ctx = ctx; this.config = config; };
  Chart.register = function() {};
  Chart.defaults = { color: '#333', borderColor: '#ddd', font: { family: 'sans-serif', size: 12 }, plugins: { legend: { labels: { usePointStyle: false } } } };
  window.Chart = Chart;
}
var registerables = [];
"@

foreach ($fn in $jsOrder) {
    $fp = Join-Path $jsDir $fn
    if (Test-Path $fp) {
        Write-Host "    - $fn" -ForegroundColor Gray
        $code = Get-Content -Path $fp -Raw -Encoding UTF8
        $stripped = Strip-ModuleSyntax $code
        if ($fn -eq "core.js") {
            $stripped = $stripped -replace """Chart\.register\(\.\.\.registerables\);""", ""
        }
        $jsParts += "`n// ===== $fn ====="
        $jsParts += $stripped
    } else {
        Write-Host "    [WARN] $fn 跳过 - 文件不存在" -ForegroundColor Red
    }
}

# Add main.js
$mainJs = Join-Path $scriptDir "main.js"
if (Test-Path $mainJs) {
    Write-Host "    - main.js" -ForegroundColor Gray
    $code = Get-Content -Path $mainJs -Raw -Encoding UTF8
    $jsParts += "`n// ===== main.js ====="
    $jsParts += Strip-ModuleSyntax $code
}

# Build preload script
$preloadHeadScript = ""
if (-not $NoData -and (Test-Path $preloadedData)) {
    Write-Host "  [注入] 预加载数据" -ForegroundColor Yellow
    $preloadedJson = Get-Content -Path $preloadedData -Raw -Encoding UTF8
    $dataObj = $preloadedJson | ConvertFrom-Json
    $periodCount = ($dataObj | Get-Member -MemberType NoteProperty).Count
    
    # Convert to v9 format
    $v9Data = @{}
    foreach ($date in ($dataObj | Get-Member -MemberType NoteProperty).Name) {
        $data = $dataObj.$date
        $allCities = $data.all.cities
        $merchantData = @{}
        foreach ($mt in @("all", "city", "ka")) {
            if ($data.$mt) {
                $merchantData.$mt = @{
                    label = $data.$mt.label
                    cities = $data.$mt.cities
                }
            }
        }
        $v9Data.$date = @{
            currentData = @{
                date = $date
                cities = $allCities
                fileName = "build-$date"
            }
            merchantData = $merchantData
            currentMerchant = "all"
        }
    }
    
    $v9Json = $v9Data | ConvertTo-Json -Depth 100
    
    $preloadHeadScript = @"
<script>
// ===== 预载数据注入 ($periodCount 期, v9格式) =====
(function() {
  try {
    const PRELOADED_DATA = $v9Json;
    const KEY = 'finance-tool-v9';
    const existing = localStorage.getItem(KEY);
    const existingData = existing ? JSON.parse(existing) : {};
    let injected = 0;
    for (const [date, entry] of Object.entries(PRELOADED_DATA)) {
      if (!existingData[date]) {
        existingData[date] = entry;
        injected++;
      }
    }
    if (injected > 0) {
      localStorage.setItem(KEY, JSON.stringify(existingData));
      console.log('[预加载] 已注入 ' + injected + ' 期数据 (v9格式)');
    } else {
      console.log('[预加载] 数据已是最新');
    }
  } catch(e) {
    console.error('[预加载] 注入失败:', e);
  }
})();
</script>
"@
    Write-Host "    $periodCount 期数据" -ForegroundColor Green
}

$jsBundle = $jsParts -join "`n"
Write-Host "  [JS] $($jsBundle.Length) 字节" -ForegroundColor Green

# Build CSS
Write-Host "  [拼接] CSS 样式" -ForegroundColor Yellow
$cssContent = ""
foreach ($cssName in @("style.css", "analysis-extract.css", "analysis-panels.css")) {
    $cssPath = Join-Path $cssDir $cssName
    if (Test-Path $cssPath) {
        Write-Host "    - $cssName" -ForegroundColor Gray
        $cssContent += (Get-Content -Path $cssPath -Raw -Encoding UTF8) + "`n"
    }
}
Write-Host "  [CSS] $($cssContent.Length) 字节" -ForegroundColor Green

# Inject into HTML
# Inject CDN + Preload + CSS into </head>
$headPos = $html.IndexOf("</head>")
if ($headPos -lt 0) {
    Write-Host "  [ERROR] 找不到 </head>" -ForegroundColor Red
    exit 1
}

$injectHead = $cdnScripts + $preloadHeadScript + "`n<style>`n$cssContent`n</style>`n"
$html = $html.Substring(0, $headPos) + $injectHead + "</head>" + $html.Substring($headPos + 7)

# Inject JS into </body>
$bodyPos = $html.LastIndexOf("</body>")
if ($bodyPos -lt 0) {
    Write-Host "  [ERROR] 找不到 </body>" -ForegroundColor Red
    exit 1
}

$html = $html.Substring(0, $bodyPos) + "`n<script>`n$jsBundle`n</script>`n</body>" + $html.Substring($bodyPos + 7)

# Output file
$outPath = Join-Path $scriptDir "index.html"
Write-Host "  [输出] $outPath" -ForegroundColor Cyan
Set-Content -Path $outPath -Value $html -Encoding UTF8 -NoNewline

$fileSize = (Get-Item $outPath).Length
Write-Host "  [完成] $($fileSize) 字节" -ForegroundColor Green

# Copy to deploy directory if it exists
if (Test-Path $deployDir) {
    $deployPath = Join-Path $deployDir "index.html"
    Write-Host "  [部署] $deployPath" -ForegroundColor Cyan
    Copy-Item -Path $outPath -Destination $deployPath -Force
}

Write-Host "`n=== 构建完成 ===" -ForegroundColor Cyan
Write-Host "  打开: file:///$($outPath.Replace('\', '/'))" -ForegroundColor Green
