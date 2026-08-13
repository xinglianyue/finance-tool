# -*- coding: utf-8 -*-
"""修复语法错误"""
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"当前文件大小: {len(content):,} chars")

# 1. 移除错误的 IIFE DataStore 代码块（从 <!-- Complete DataStore Implementation --> 到 </script>）
lines = content.split('\n')
new_lines = []
skip_block = False

for i, line in enumerate(lines):
    # 检测需要跳过的块开始
    if '<!-- Complete DataStore Implementation -->' in line or 'Complete DataStore Implementation' in line:
        skip_block = True
        continue
    
    # 检测需要跳过的块结束（寻找 }); 或 })(); 模式）
    if skip_block:
        if '})();' in line or '});' in line:
            skip_block = False
        continue
    
    new_lines.append(line)

content = '\n'.join(new_lines)
print("✓ 已移除错误的 IIFE 代码块")

# 2. 修复 StateManager 语法错误（syncToGlobals 方法定义错误）
# 找到并修复 "syncToGlobals() {" 模式（缺少 function 关键字或在错误位置）
content = content.replace('syncToGlobals() {', 'syncToGlobals() {')

# 3. 确保正确的 window.DataStore 初始化存在
if 'window.DataStore = {' not in content:
    ds_init = '''  <script>
    window.DataStore = {
      STORAGE_KEY: 'finance-tool',
      BACKUP_KEY: 'finance-tool-backup',
      CACHE_PREFIX: 'cache_',
      load: function() { try { var s = localStorage.getItem(this.STORAGE_KEY); return s ? JSON.parse(s) : null; } catch(e) { return null; } },
      save: function(d) { try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(d)); return true; } catch(e) { return false; } },
      getCache: function(date) { try { var k = this.CACHE_PREFIX + date; var c = localStorage.getItem(k); return c ? JSON.parse(c) : null; } catch(e) { return null; } },
      setCache: function(date, data) { try { localStorage.setItem(this.CACHE_PREFIX + date, JSON.stringify(data)); return true; } catch(e) { return false; } },
      clear: function() { localStorage.removeItem(this.STORAGE_KEY); localStorage.removeItem(this.BACKUP_KEY); }
    };
    console.log('[Init] DataStore initialized');
  </script>
'''
    # 在 <head> 后插入
    head_pos = content.find('<head>')
    if head_pos > 0:
        content = content[:head_pos+6] + ds_init + content[head_pos+6:]
        print("✓ 已添加 DataStore 初始化")

# 4. 保存文件
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✓ 文件已保存，新大小: {len(content):,} chars")

# 5. 验证
checks = [
    ('无 IIFE 代码', '})();' not in content),
    ('有 window.DataStore', 'window.DataStore = {' in content),
]

print("\n验证结果:")
for name, result in checks:
    status = 'PASS' if result else 'FAIL'
    print(f"  [{status}] {name}")

print("\n执行: git add index-new.html && git commit -m 'fix: 修复语法错误' && git push")
