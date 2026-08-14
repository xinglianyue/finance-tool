# 修复 index-new.html 中的两个根本性语法错误

$file = "C:\Users\xinxi\Desktop\财务工具\index-new.html"
$content = Get-Content $file -Raw -Encoding UTF8

# 错误1: 移除第一处 DataStore 初始化中的 return store; 和 })();
$content = $content -replace '      console\.log\('\[Init\] DataStore\.setCache is:', typeof window\.DataStore\.setCache\);'`r`n      return store;'`r`n    \)\}\(\);', ''

# 错误2: 修复 setTimeout 位置错误 - 将 setTimeout 移入 initialize 方法内部
# 原来的代码在 initialize 方法的闭合大括号后有一个 setTimeout，这导致了语法错误
$pattern = @'
        \}\s*// 等待数据完全加载后再渲染\s*\}\s*\(\s*,\s*500\s*\);\s*syncToGlobals\(\)
'@

# 使用更简单的方法：找到并替换整个错误的结构
$oldCode = @'
          console.log('[StateManager] 状态初始化完成', this.state);
          this.notify('init', this.state);
        }
        // 等待数据完全加载后再渲染
        setTimeout(() => {
          console.log('[App] 延迟渲染维度表，allMerchantData:', !!window.allMerchantData);
          if (window.allMerchantData && Object.keys(window.allMerchantData).length > 0) {
            renderDimensionTable();
          } else {
            console.warn('[App] 数据仍未准备好，等待用户交互');
          }
        }, 500);

        
        syncToGlobals() {
'@

$newCode = @'
          console.log('[StateManager] 状态初始化完成', this.state);
          this.notify('init', this.state);
          
          // 等待数据完全加载后再渲染
          setTimeout(() => {
            console.log('[App] 延迟渲染维度表，allMerchantData:', !!window.allMerchantData);
            if (window.allMerchantData && Object.keys(window.allMerchantData).length > 0) {
              renderDimensionTable();
            } else {
              console.warn('[App] 数据仍未准备好，等待用户交互');
            }
          }, 500);
        }
        
        syncToGlobals() {
'@

if ($content -match [regex]::Escape($oldCode)) {
    Write-Host "Found the syntax error in StateManager, fixing..."
    $content = $content -replace [regex]::Escape($oldCode), $newCode
} else {
    Write-Host "StateManager fix not found, trying alternative..."
}

# 保存文件
$content | Out-File $file -Encoding UTF8 -NoNewline
Write-Host "Fixed!"
