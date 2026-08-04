const fs = require('fs');
const path = require('path');

// 读取 index-new.html
const htmlPath = path.join(__dirname, 'index-new.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

console.log('Original size:', htmlContent.length);

// 检查当前的脚本加载顺序
const scriptMatches = htmlContent.match(/<script[^>]*>/g) || [];
console.log('\n=== Current Script Loading Order ===');
scriptMatches.forEach((script, idx) => {
  const srcMatch = script.match(/src="([^"]+)"/);
  if (srcMatch) {
    console.log(`${idx + 1}. ${srcMatch[1]}`);
  }
});

// 确保 data-store.js 在其他脚本之前加载
// 找到第一个 script 标签的位置
const firstScriptIndex = htmlContent.indexOf('<script');

if (firstScriptIndex !== -1) {
  // 在第一个 script 之前插入 data-store.js
  const datastoreScript = '<script src="js/data-store.js?v=20260731.11"></script>\n  ';
  
  // 检查是否已经存在 data-store.js 引用
  if (!htmlContent.includes('js/data-store.js')) {
    // 插入到第一个 script 之前
    htmlContent = htmlContent.slice(0, firstScriptIndex) + datastoreScript + htmlContent.slice(firstScriptIndex);
    console.log('\n✓ Added data-store.js to the beginning of script tags');
  } else {
    console.log('\n⚠ data-store.js already exists, need to check order');
  }
}

// 添加内联脚本确保 DataStore 初始化（作为备选方案）
const initScript = `
<script>
  // 确保 DataStore 已正确初始化
  (function() {
    if (typeof DataStore === 'undefined') {
      console.error('[Init] DataStore not found! Checking if script loaded...');
      // 尝试重新加载
      var script = document.createElement('script');
      script.src = 'js/data-store.js?v=' + Date.now();
      script.onload = function() {
        console.log('[Init] DataStore reloaded successfully');
        if (typeof window.DataStore !== 'undefined') {
          console.log('[Init] window.DataStore initialized:', typeof window.DataStore.save);
        }
      };
      script.onerror = function() {
        console.error('[Init] Failed to reload DataStore');
      };
      document.head.appendChild(script);
    } else {
      console.log('[Init] DataStore already available');
    }
  })();
</script>
`;

// 在 </head> 前插入初始化脚本
const headCloseIndex = htmlContent.indexOf('</head>');
if (headCloseIndex !== -1) {
  htmlContent = htmlContent.slice(0, headCloseIndex) + initScript + htmlContent.slice(headCloseIndex);
  console.log('✓ Added DataStore initialization script');
}

// 写回文件
fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
console.log('\nFinal size:', htmlContent.length);
console.log('File updated successfully!');