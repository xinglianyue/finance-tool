# -*- coding: utf-8 -*-
"""彻底修复编码和版本号问题"""
import time
import re
import os

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

# 读取文件（处理可能的BOM）
with open(path, "rb") as f:
    raw = f.read()

# 移除BOM
if raw[:3] == b'\xef\xbb\xbf':
    raw = raw[3:]
    print("Removed BOM")

content = raw.decode('utf-8')
print(f"File size: {len(content)} chars")

# 修复所有损坏的版本号
new_ts = str(int(time.time()))
print(f"New timestamp: {new_ts}")

# 替换各种损坏的版本格式
content = content.replace("'UnixTi25e'", f"'{new_ts}'")
content = content.replace("'1785821216'", f"'{new_ts}'")
content = content.replace("'1785821154'", f"'{new_ts}'")
content = content.replace("'1785814622'", f"'{new_ts}'")
content = content.replace("v=UnixTi25e", f"v={new_ts}")
content = content.replace("v=1785821216", f"v={new_ts}")
content = content.replace("v=1785821154", f"v={new_ts}")
content = content.replace("v=1785814622", f"v={new_ts}")

# 修复乱码
content = content.replace("专�?", "专用")
content = content.replace("检�?", "检测")
content = content.replace("\xef\xbd\xbc", "")  # 全角问号
content = content.replace("\xc2\xbf", "")      # 倒置问号

# 写入文件（不带BOM）
with open(path, "wb") as f:
    f.write(content.encode('utf-8'))

print(f"Fixed! New version: {new_ts}")
print("Run: git add -A && git commit -m 'fix: 修复编码和版本问题' && git push")
