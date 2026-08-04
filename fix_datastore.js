const fs = require('fs');
const path = require('path');

// 读取 index-new.html
const htmlPath = path.join(__dirname, 'index-new.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf-8', 'utf-8');

console.log('当前HTML大小:', htmlContent.length, '字符');

// 检查data-store.js的引用
const datastoreMatch = htmlContent.match(/<script[^>]*src="js\/data-store\.js[^"]*"[^>]*>/);
if (datastoreMatch) {
  console.log('\n找到data-store.js引用:', datastoreMatch[0]);
} else {
  console.log('\n未找到data-store.js引用，需要添加');
}

// 添加内联初始化脚本，确保DataStore在任何其他脚本之前可用
const initScript = `
<script>
  // 立即初始化DataStore，确保在任何其他脚本之前可用
  (function() {
    console.log('[Init] 开始初始化 DataStore...');
    
    // 如果 DataStore 不存在，立即创建
    if (typeof window.DataStore === 'undefined') {
      console.warn('[Init] DataStore 未定义，创建临时实例');
      
      // 创建临时的 DataStore 实现
      window.DataStore = {
        STORAGE_KEY: 'finance-tool',
        BACKUP_KEY: 'finance-tool-backup',
        CACHE_PREFIX: 'cache_',
        
        load: function() {
          try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : null;
          } catch (e) {
            console.error('[DataStore] 加载失败:', e);
            return null;
          }
        },
        
        save: function(data) {
          try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            console.log('[DataStore] 数据已保存');
            return true;
          } catch (e) {
            console.error('[DataStore] 保存失败:', e);
            return false;
          }
        },
        
        getCache: function(date) {
          try {
            const key = this.CACHE_PREFIX + date;
            const cached = localStorage.getItem(key);
            return cached ? JSON.parse(cached) : null;
          } catch (e) {
            return null;
          }
        },
        
        setCache: function(date, data) {
          try {
            const key = this.CACHE_PREFIX + date;
            localStorage.setItem(key, JSON.stringify(data));
            return true;
          } catch (e) {
            return false;
          }
        }
      };
      
      console.log('[Init] 临时 DataStore 已创建');
    } else {
      console.log('[Init] DataStore 已存在:', typeof window.DataStore.save);
    }
    
    // 验证方法存在
    if (typeof window.DataStore.save !== 'function') {
      console.error('[Init] 错误: DataStore.save 不是函数!');
    } else {
      console.log('[Init] ✓ DataStore 初始化成功');
    }
  })();
</script>
`;

// 在 </head> 前插入初始化脚本
const headCloseIndex = htmlContent.indexOf('</head>');
if (headCloseIndex !== -1) {
  htmlContent = htmlContent.slice(0, headCloseIndex) + initScript + htmlContent.slice(headCloseIndex);
  console.log('\n✓ 已添加 DataStore 初始化脚本');
} else {
  console.log('\n✗ 未找到 </head> 标签');
}

// 写回文件
fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
console.log('\n最终文件大小:', htmlContent.length, '字符');
console.log('文件已更新!');