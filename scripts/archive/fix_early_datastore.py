# -*- coding: utf-8 -*-
"""彻底修复 - 确保DataStore在代码执行前就存在"""
import sys
import io
import re
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"Current size: {len(content)} chars")

# 生成新版本号
new_ts = str(int(time.time()))
print(f"New version: {new_ts}")

# 移除所有旧的DataStore初始化（如果存在）
content = re.sub(r'<!-- DataStore fallback.*?</script>', '', content, flags=re.DOTALL)
content = re.sub(r'<!-- 内联DataStore.*?</script>', '', content, flags=re.DOTALL)

# 在<head>末尾添加一个简单的DataStore初始化（必须在所有其他脚本之前）
early_init = '''
  <script>
    // 立即初始化DataStore，确保在任何代码执行前就存在
    window.DataStore = window.DataStore || {
      STORAGE_KEY: 'finance-tool',
      BACKUP_KEY: 'finance-tool-backup',
      CACHE_PREFIX: 'cache_',
      load: function() {
        try {
          const stored = localStorage.getItem(this.STORAGE_KEY);
          return stored ? JSON.parse(stored) : null;
        } catch (e) { console.error('[DataStore] load error:', e); return null; }
      },
      save: function(data) {
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
          console.log('[DataStore] saved');
          return true;
        } catch (e) { console.error('[DataStore] save error:', e); return false; }
      },
      getCache: function(date) {
        try {
          const key = this.CACHE_PREFIX + date;
          const cached = localStorage.getItem(key);
          return cached ? JSON.parse(cached) : null;
        } catch (e) { return null; }
      },
      setCache: function(date, data) {
        try {
          const key = this.CACHE_PREFIX + date;
          localStorage.setItem(key, JSON.stringify(data));
          return true;
        } catch (e) { return false; }
      }
    };
    console.log('[Init] DataStore immediately initialized');
  </script>
'''

# 在</head>前插入
if '</head>' in content:
    content = content.replace('</head>', early_init + '\n</head>')
    print("Added early DataStore initialization")

# 更新版本号
content = re.sub(r"APP_VERSION = '\d+'", f"APP_VERSION = '{new_ts}'", content)
content = re.sub(r'v=\d+', f'v={new_ts}', content)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Saved! New size: {len(content)} chars")
print("\nRun: git add index-new.html && git commit -m 'fix: early DataStore init' && git push")
