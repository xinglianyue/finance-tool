# -*- coding: utf-8 -*-
"""诊断共享数据文件问题"""
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 70)
print("诊断 shared-data.json 问题")
print("=" * 70)

# 检查本地文件
import os
path = r"C:\Users\xinxi\Desktop\财务工具\shared-data.json"
if os.path.exists(path):
    size = os.path.getsize(path)
    print(f"\n[本地文件] shared-data.json")
    print(f"  位置: {path}")
    print(f"  大小: {size:,} bytes ({size/1024/1024:.2f} MB)")
else:
    print("\n[本地文件] shared-data.json 不存在!")

# 检查 GitHub 上的文件
try:
    import urllib.request
    import json
    req = urllib.request.Request(
        'https://api.github.com/repos/xinglianyue/finance-tool/contents/shared-data.json',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
        github_size = data.get('size', 0)
        print(f"\n[GitHub 文件] shared-data.json")
        print(f"  大小: {github_size:,} bytes ({github_size/1024/1024:.2f} MB)")
        print(f"  SHA: {data.get('sha', 'N/A')[:8]}")
except Exception as e:
    print(f"\n[GitHub 检查] 错误: {e}")

# 分析加载逻辑
html_path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

print("\n[加载逻辑分析]")
# 查找 fetch 相关代码
fetch_lines = []
for i, line in enumerate(content.split('\n'), start=1):
    if 'fetch(' in line and ('shared-data' in line or './shared-data' in line):
        fetch_lines.append((i, line.strip()))

if fetch_lines:
    print(f"  找到 {len(fetch_lines)} 个 fetch 调用:")
    for line_num, line_text in fetch_lines[:5]:
        print(f"    Line {line_num}: {line_text[:70]}...")
else:
    print("  未找到 fetch 调用")

# 检查是否有缓存机制
print("\n[缓存机制检查]")
if 'localStorage.getItem' in content and 'finance-tool' in content:
    print("  ✓ 有 localStorage 缓存机制")
if 'cloudData' in content or 'currentData' in content:
    print("  ✓ 有云端数据缓存")

print("\n" + "=" * 70)
