# -*- coding: utf-8 -*-
"""检查文件是否已提交"""
import sys
import io
import hashlib

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "rb") as f:
    raw = f.read()

file_hash = hashlib.md5(raw).hexdigest()
print(f"Local file MD5: {file_hash}")
print(f"Local file size: {len(raw)} bytes")

# 检查关键内容
content = raw.decode('utf-8')
has_inline_ds = '内联DataStore' in content or 'window.DataStore = {' in content
print(f"Has inline DataStore: {has_inline_ds}")
print(f"Has APP_VERSION: {'APP_VERSION' in content}")
