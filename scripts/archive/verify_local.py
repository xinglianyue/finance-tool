# -*- coding: utf-8 -*-
"""检查本地文件的编码和版本"""
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "rb") as f:
    raw = f.read()

print(f"File size: {len(raw)} bytes")
print(f"BOM present: {raw[:3] == b'\\xef\\xbb\\xbf'}")

# 解码为UTF-8
content = raw.decode('utf-8', errors='replace')

# 检查标题
title_match = re.search(r'<title>(.*?)</title>', content)
if title_match:
    title = title_match.group(1)
    print(f"\nTitle found: {repr(title)}")
    
    # 检查是否包含正确的中文
    if '财务分析工具' in title and '美团代理商专用' in title:
        print("✓ Title is CORRECT!")
    else:
        print("⚠ Title may have issues")
        
        # 显示十六进制
        title_bytes = title.encode('utf-8')
        print(f"  Title bytes (hex): {title_bytes.hex()}")
        
        # 尝试解析每个字符
        try:
            decoded = title_bytes.decode('utf-8')
            print(f"  Decoded: {decoded}")
        except:
            pass

# 检查版本
version_match = re.search(r"var APP_VERSION = '(\d+)';", content)
if version_match:
    print(f"\nAPP_VERSION: {version_match.group(1)}")

# 检查script标签
ds_match = re.search(r'js/data-store\.js\?v=(\d+)', content)
if ds_match:
    print(f"JS cache version: {ds_match.group(1)}")

# 检查替换字符
if '\ufffd' in content:
    count = content.count('\ufffd')
    print(f"\n⚠ Found {count} replacement characters")
else:
    print("\n✓ No replacement characters found")
