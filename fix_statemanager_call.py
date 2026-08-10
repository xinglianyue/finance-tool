# -*- coding: utf-8 -*-
"""修复 StateManager.init -> StateManager.initialize"""
import sys
import io
import re
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"当前文件大小: {len(content)} chars")

# 生成新版本号
new_ts = str(int(time.time()))
print(f"新版本号: {new_ts}")

# 替换所有 StateManager.init 调用为 StateManager.initialize
old_count = content.count('StateManager.init')
content = content.replace('StateManager.init', 'StateManager.initialize')
new_count = content.count('StateManager.initialize')

print(f"已替换 {old_count} 处 StateManager.init 调用")

# 同时确保有 history_meta 处理逻辑
# 在数据加载后添加格式检查
if 'history_meta' not in content:
    # 找到 cloudData 处理的位置并添加兼容性代码
    insert_point = content.find('let currentData = buildV3Data(cloudData)')
    if insert_point > 0:
        compat_code = '''
        // 兼容新格式：如果有 history_meta，提取最新记录
        if (Array.isArray(cloudData) && cloudData.length > 0 && cloudData[0].type === 'history_meta') {
          const latestRecord = cloudData.find(item => item.date);
          if (latestRecord) {
            cloudData = latestRecord;
            console.log('[App] 使用新格式数据');
          }
        }
        
'''
        content = content[:insert_point] + compat_code + content[insert_point:]
        print("✓ 添加了 history_meta 兼容性处理")

# 更新版本号
content = re.sub(r"APP_VERSION = '\d+'", f"APP_VERSION = '{new_ts}'", content)
content = re.sub(r'v=\d+', f'v={new_ts}', content)
print(f"✓ 版本更新为 {new_ts}")

# 保存文件
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✓ 文件已保存，新大小: {len(content)} chars")

# 验证
with open(path, "r", encoding="utf-8") as f:
    verify = f.read()
    
checks = [
    ('无 StateManager.init 残留', 'StateManager.init(' not in verify),
    ('有 StateManager.initialize 调用', 'StateManager.initialize(' in verify),
    ('有 history_meta 处理', 'history_meta' in verify),
    ('版本号正确', new_ts in verify),
]

print("\n验证结果:")
all_pass = True
for name, result in checks:
    status = 'PASS' if result else 'FAIL'
    print(f"  [{status}] {name}")
    if not result:
        all_pass = False

if all_pass:
    print("\n✓ 所有检查通过！")
else:
    print("\n✗ 有些检查失败了")

print("\n执行: git add index-new.html && git commit -m 'fix: StateManager.init -> initialize' && git push")
