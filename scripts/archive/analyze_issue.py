# -*- coding: utf-8 -*-
"""分析真正的根本问题"""
import sys
import io
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print("=" * 70)
print("分析 index-new.html 中的数据加载逻辑")
print("=" * 70)

# 1. 检查 DataStore 相关
print("\n[1] DataStore 状态:")
print(f"  - 内联初始化: {'存在' if 'window.DataStore = {' in content else '缺失'}")
print(f"  - save方法: {'存在' if 'save: function' in content else '缺失'}")
print(f"  - load方法: {'存在' if 'load: function' in content else '缺失'}")

# 2. 检查 StateManager 引用
print("\n[2] StateManager 状态:")
print(f"  - state-manager.js引用: {'存在' if 'state-manager.js' in content else '缺失'}")
print(f"  - initialize调用: {'存在' if 'StateManager.initialize' in content else '缺失'}")

# 3. 检查 shared-data.json 加载逻辑
print("\n[3] 数据加载逻辑:")
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'shared-data.json' in line or 'loadFromCloud' in line:
        print(f"  Line {i+1}: {line.strip()[:80]}")
    if i > 10700 and i < 10800:  # 查看加载函数
        if 'try' in line or 'catch' in line or 'fetch' in line:
            print(f"  Line {i+1}: {line.strip()[:80]}")

# 4. 检查 localStorage 缓存逻辑
print("\n[4] localStorage 缓存逻辑:")
if 'localStorage.getItem' in content:
    print("  - 有 localStorage 读取逻辑")
if 'finance-tool' in content:
    print("  - 使用 finance-tool 作为 key")

# 5. 检查是否有离线模式
print("\n[5] 离线模式支持:")
if 'offline' in content.lower():
    print("  - 检测到离线模式相关代码")
else:
    print("  - 未检测到离线模式")

# 6. 检查版本
print("\n[6] 当前版本:")
v = re.search(r"APP_VERSION = '(\d+)'", content)
print(f"  - APP_VERSION: {v.group(1) if v else '未找到'}")

print("\n" + "=" * 70)
