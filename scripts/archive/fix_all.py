# -*- coding: utf-8 -*-
"""彻底修复编码和版本问题"""
import time
import re
import os

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

# 读取原始文件（二进制模式）
with open(path, "rb") as f:
    raw = f.read()

# 移除 BOM
if raw[:3] == b'\xef\xbb\xbf':
    raw = raw[3:]
    print("Removed BOM")

content = raw.decode('utf-8')
print(f"File size: {len(content)} chars")

# 生成新的时间戳
new_ts = str(int(time.time()))
print(f"New timestamp: {new_ts}")

# 替换所有损坏的版本号
replacements = [
    ("'UnixTi25e'", f"'{new_ts}'"),
    ("'1785821216'", f"'{new_ts}'"),
    ("'1785821154'", f"'{new_ts}'"),
    ("'1785814622'", f"'{new_ts}'"),
    ("v=UnixTi25e", f"v={new_ts}"),
    ("v=1785821216", f"v={new_ts}"),
    ("v=1785821154", f"v={new_ts}"),
    ("v=1785814622", f"v={new_ts}"),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f"Fixed: {old} -> {new}")

# 修复乱码字符
fixes = [
    ('专\u00bf?', '专用'),
    ('检\u00bf?', '检测'),
    ('资\u00bf?', '资源'),
]

for bad, good in fixes:
    count = content.count(bad)
    if count > 0:
        content = content.replace(bad, good)
        print(f"Fixed {count} instances of: {bad} -> {good}")

# 重新写入（不带 BOM）
with open(path, "wb") as f:
    f.write(content.encode('utf-8'))

print(f"\nSaved! Size: {len(content)} chars")
print("\nRun: git add index-new.html && git commit -m 'fix: 修复编码和版本问题' && git push")
