# -*- coding: utf-8 -*-
"""修复数据加载逻辑"""
import sys
import io
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"当前文件大小: {len(content)} chars")

# 1. 修复数据格式检查逻辑
# 原来的检查：cloudData 必须是数组
# 修改后：cloudData 可以是数组或对象（新格式提取后是对象）

old_check = 'if (!cloudData || !Array.isArray(cloudData) || cloudData.length === 0)'
new_check = 'if (!cloudData)'

if old_check in content:
    content = content.replace(old_check, new_check)
    print("✓ 已修复数据格式检查逻辑")
else:
    print("⚠ 未找到预期的检查逻辑，将尝试其他模式")
    # 尝试更灵活的匹配
    pattern = r'if\s*\(\s*!cloudData\s*\|\|\s*!Array\.isArray\(cloudData\)\s*\|\|\s*cloudData\.length\s*===?\s*0\s*\)'
    matches = list(re.finditer(pattern, content))
    if matches:
        for m in reversed(matches):
            content = content[:m.start()] + 'if (!cloudData)' + content[m.end():]
        print(f"✓ 已修复 {len(matches)} 处检查逻辑")

# 2. 修复日志输出
old_log = "console.log('[App] 云端数据加载成功，共' + cloudData.length + '条记录');"
new_log = """console.log('[App] 云端数据加载成功');
          if (Array.isArray(cloudData)) {
            console.log('[App] 数据记录数:', cloudData.length);
          } else {
            console.log('[App] 数据日期:', cloudData.date);
          }"""

if old_log in content:
    content = content.replace(old_log, new_log)
    print("✓ 已修复日志输出")

# 3. 保存文件
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\n✓ 文件已保存，新大小: {len(content)} chars")

# 4. 验证
print("\n验证结果:")
with open(path, "r", encoding="utf-8") as f:
    verify = f.read()
    
checks = [
    ('无错误的 Array.isArray 检查', '!Array.isArray(cloudData)' not in verify),
    ('有新的日志输出', '数据记录数' in verify),
]

for name, result in checks:
    status = 'PASS' if result else 'FAIL'
    print(f"  [{status}] {name}")

print("\n执行: git add index-new.html && git commit -m 'fix: 修复数据格式检查逻辑' && git push")
