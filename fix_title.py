# -*- coding: utf-8 -*-
"""修复损坏的编码 - 替换损坏的中文字符"""
import time
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "rb") as f:
    raw = f.read()

print(f"Original size: {len(raw)} bytes")

# 生成新时间戳
new_ts = str(int(time.time()))

# 读取并解码（使用errors='replace'来处理损坏的部分）
content = raw.decode('utf-8', errors='replace')

# 修复版本号
versions = [
    "'UnixTi25e'",
    "'1786006211'",
    "'1786005675'",
    "'1786004365'",
    "'1785821216'",
    "'1785821154'",
    "'1785814622'",
]
for v in versions:
    if v in content:
        content = content.replace(v, f"'{new_ts}'")
        print(f"Fixed version: {v}")

cache_versions = [
    "v=UnixTi25e",
    "v=1786006211",
    "v=1786005675",
    "v=1786004365",
    "v=1785821216",
    "v=1785821154",
    "v=1785814622",
]
for v in cache_versions:
    if v in content:
        content = content.replace(v, f"v={new_ts}")
        print(f"Fixed cache: {v}")

# 修复标题行中的损坏字符
# 损坏的: 璐㈠姟鍒嗘瀽宸ュ叿 - 缇庡洟浠ｇ悊鍟嗕笓鐢?
# 正确的: 财务分析工具 - 美团代理商专用

replacements = [
    ('璐㈠姟鍒嗘瀽宸ュ叿', '财务分析工具'),
    ('缇庡洟浠ｇ悊鍟嗕笓鐢?', '美团代理商专用'),
    ('妫€', '检测'),  # 可能的其他损坏
    ('锛?', ''),  # 乱码标点
    ('鏈?', '版本'),  # 可能的其他损坏
]

fixed_count = 0
for bad, good in replacements:
    count = content.count(bad)
    if count > 0:
        content = content.replace(bad, good)
        fixed_count += count
        print(f"Fixed '{bad}' -> '{good}': {count} times")

# 重新写入（不带BOM，UTF-8）
with open(path, "wb") as f:
    f.write(content.encode('utf-8'))

print(f"\nTotal fixes: {fixed_count}")
print(f"New version: {new_ts}")
print("Run: git add index-new.html && git commit -m 'fix: 修复标题编码' && git push")
