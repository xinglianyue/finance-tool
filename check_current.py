# -*- coding: utf-8 -*-
"""检查当前文件状态并提交"""
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"Current file size: {len(content)} chars")
print(f"Has inline DataStore: {'window.DataStore = {' in content}")
print(f"Has 内联DataStore: {'内联DataStore' in content}")

# 查找内联DataStore的位置
if 'window.DataStore = {' in content:
    idx = content.find('window.DataStore = {')
    print(f"\nInline DataStore found at position: {idx}")
    print(f"Context: {repr(content[idx:idx+100])}")
