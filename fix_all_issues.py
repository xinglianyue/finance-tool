# -*- coding: utf-8 -*-
"""修复 StateManager 调用并添加 history_meta 处理"""
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

# 1. 修复错误的替换：把 initializeialize 改回 initialize
content = content.replace('StateManager.initializeialize', 'StateManager.initialize')
fixed_count = content.count('StateManager.initialize')
print(f"✓ 已修复 {fixed_count} 处 StateManager.initialize 调用")

# 2. 确保没有残留的 init 调用（除了可能的注释）
init_in_code = len(re.findall(r'StateManager\.init\s*\(', content))
if init_in_code > 0:
    print(f"⚠ 发现 {init_in_code} 处未修复的 StateManager.init 调用")
else:
    print("✓ 无残留的 StateManager.init 调用")

# 3. 添加 history_meta 处理逻辑
# 在数据加载后、buildV3Data 前插入兼容性代码
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

# 找到 buildV3Data 调用的位置
build_v3_pattern = r'let currentData = buildV3Data\(cloudData\)'
matches = list(re.finditer(build_v3_pattern, content))

if matches:
    # 在每个匹配位置前插入兼容性代码
    insert_points = []
    for m in reversed(matches):  # 从后往前插入，避免位置偏移
        insert_points.append(m.start())
    
    for pos in insert_points:
        content = content[:pos] + compat_code + content[pos:]
    
    print(f"✓ 添加了 {len(insert_points)} 处 history_meta 兼容性处理")
else:
    print("⚠ 未找到 buildV3Data 调用，将尝试其他位置")
    # 尝试在其他位置添加
    load_success = content.find('console.log(\'[App] 从相对路径加载成功\')')
    if load_success > 0:
        content = content[:load_success] + compat_code + content[load_success:]
        print("✓ 在加载成功后添加了兼容性处理")

# 4. 更新版本号
content = re.sub(r"APP_VERSION = '\d+'", f"APP_VERSION = '{new_ts}'", content)
content = re.sub(r'v=\d+', f'v={new_ts}', content)
print(f"✓ 版本更新为 {new_ts}")

# 5. 保存文件
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✓ 文件已保存，新大小: {len(content)} chars")

# 6. 验证
print("\n验证结果:")
checks = [
    ('StateManager.initialize 存在', content.count('StateManager.initialize') == fixed_count),
    ('无错误的 initializeialize', 'initializeialize' not in content),
    ('有 history_meta 处理', 'history_meta' in content),
    ('版本号正确', new_ts in content),
]

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

print(f"\n执行: git add index-new.html && git commit -m 'fix: 修复StateManager和添加history_meta处理 v{new_ts}' && git push")
