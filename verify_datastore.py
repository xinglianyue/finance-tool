# -*- coding: utf-8 -*-
"""验证内联DataStore是否正确插入"""
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print("=" * 60)
print("验证内联DataStore")
print("=" * 60)

# 检查内联DataStore是否存在
if '内联DataStore' in content:
    print("\n✓ 内联DataStore已添加")
else:
    print("\n✗ 内联DataStore未找到")

# 检查版本
import re
version_match = re.search(r"APP_VERSION = '(\d+)';", content)
if version_match:
    print(f"\nAPP_VERSION: {version_match.group(1)}")

# 检查script标签顺序
scripts = re.findall(r'<script[^>]*src="([^"]*)"[^>]*>|<script>(.*?)</script>', content, re.DOTALL)
print(f"\nFound {len(scripts)} script tags:")
for i, s in enumerate(scripts[:5], 1):
    if s[0]:  # External script
        print(f"  {i}. External: {s[0]}")
    else:  # Inline script
        print(f"  {i}. Inline: {s[1][:50]}...")

# 检查DataStore的调用位置
datastore_calls = []
for match in re.finditer(r'window\.onload|DataStore\.save|DataStore\.load', content):
    pos = match.start()
    line_num = content[:pos].count('\n') + 1
    datastore_calls.append((line_num, match.group(0)))

print(f"\nDataStore usage found at lines:")
for line_num, call in datastore_calls[:5]:
    print(f"  Line {line_num}: {call}")

print("\n" + "=" * 60)
