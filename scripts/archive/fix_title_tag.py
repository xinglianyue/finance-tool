# -*- coding: utf-8 -*-
"""修复缺失的结束标签"""
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "rb") as f:
    content = f.read().decode('utf-8')

print(f"File size: {len(content)} chars")

# 检查标题行
if '<title>财务分析工具 - 美团代理商专用/title>' in content:
    print("Found broken title tag - fixing...")
    content = content.replace(
        '<title>财务分析工具 - 美团代理商专用/title>',
        '<title>财务分析工具 - 美团代理商专用</title>'
    )
    print("Fixed!")

# 检查其他可能的类似损坏
broken_tags = [
    '</span>',
    '</option>',
    '</div>',
    '</button>',
]

for tag in broken_tags:
    # 查找可能的损坏形式
    pass

with open(path, "wb") as f:
    f.write(content.encode('utf-8'))

print(f"Saved! New size: {len(content)} chars")
print("\nRun: git add index-new.html && git commit -m 'fix: 修复标题标签格式' && git push")
