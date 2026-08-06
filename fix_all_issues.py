# -*- coding: utf-8 -*-
"""彻底修复所有编码问题"""
import time
import re

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

# 读取文件
with open(path, "rb") as f:
    raw = f.read()

# 移除 BOM
if raw[:3] == b'\xef\xbb\xbf':
    raw = raw[3:]

content = raw.decode('utf-8', errors='replace')
print(f"Original size: {len(content)} chars")

# 生成新时间戳
new_ts = str(int(time.time()))
print(f"New version: {new_ts}")

# 修复版本号 - 直接替换字符串
bad_versions = ["'UnixTi25e'", "'1786005675'", "'1785821216'", "'1785821154'", "'1785814622'"]
for v in bad_versions:
    content = content.replace(v, f"'{new_ts}'")
    if v in content or f"'{new_ts}'" in content:
        print(f"Fixed version: replaced with {new_ts}")

# 修复缓存版本
bad_cache_versions = ["v=UnixTi25e", "v=1786005675", "v=1785821216", "v=1785821154", "v=1785814622"]
for v in bad_cache_versions:
    content = content.replace(v, f"v={new_ts}")
    if v in content or f"v={new_ts}" in content:
        print(f"Fixed cache: replaced with v={new_ts}")

# 修复乱码字符 - 使用明确的替换
# 注意：这里需要精确匹配乱码字符
lines = content.split('\n')
fixed_lines = []
fixes_count = 0

for line in lines:
    fixed_line = line
    
    # 修复标题行的乱码
    if '<title>' in line and '财务' in line:
        # 检查是否有乱码
        if '��' in line:
            fixed_line = line.replace('��', '')
            fixed_lines.append(fixed_line)
            fixes_count += 1
            print(f"Fixed title line")
            continue
    
    # 修复其他可能的乱码
    if '\ufffd' in line:
        fixed_line = line.replace('\ufffd', '')
        fixes_count += 1
    
    fixed_lines.append(fixed_line)

content = '\n'.join(fixed_lines)

# 重新写入（不带BOM）
with open(path, "wb") as f:
    f.write(content.encode('utf-8'))

print(f"\nFixed! {fixes_count} replacements made")
print(f"Final size: {len(content)} chars")
print("\nRun: git add index-new.html && git commit -m 'fix: 修复编码问题' && git push")
