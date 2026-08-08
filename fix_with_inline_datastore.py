# -*- coding: utf-8 -*-
"""彻底检查并修复 - 内联DataStore以避免CDN缓存问题"""
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"Original size: {len(content)} chars")

# 生成新的时间戳
new_ts = str(int(time.time()))
print(f"New timestamp: {new_ts}")

# 1. 确保所有版本号更新
import re
content = re.sub(r'v=\d+', f'v={new_ts}', content)
content = re.sub(r"APP_VERSION = '\d+'", f"APP_VERSION = '{new_ts}'", content)
print(f"Updated all versions to {new_ts}")

# 2. 在内联脚本中添加DataStore的立即初始化（在加载外部脚本之前）
# 找到一个安全的位置插入DataStore内联定义
inline_datastore = '''
  <!-- 内联DataStore初始化，避免CDN缓存问题 -->
  <script>
    // 确保DataStore立即可用
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
    console.log('[Init] 内联DataStore已初始化');
  </script>
'''

# 在</head>前插入内联DataStore
if '<script src="js/data-store.js' in content and '内联DataStore' not in content:
    content = content.replace('</head>', inline_datastore + '</head>')
    print("✓ Added inline DataStore initialization")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nFixed! New size: {len(content)} chars")
print(f"Version: {new_ts}")
