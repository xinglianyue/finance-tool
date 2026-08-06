# -*- coding: utf-8 -*-
"""检查文件编码问题"""
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "rb") as f:
    raw = f.read()

print(f"File size: {len(raw)} bytes")
print(f"BOM: {raw[:3] == b'\xef\xbb\xbf'}")

# 查找title标签
try:
    content = raw.decode('utf-8')
    idx = content.find('<title>')
    if idx >= 0:
        end = content.find('</title>', idx)
        print(f"Title section (bytes {idx}-{end}):")
        print(repr(content[idx:end+8]))
    else:
        print("No </title> found")
except Exception as e:
    print(f"Decode error: {e}")

# 检查是否有替换字符
if '\ufffd' in content:
    count = content.count('\ufffd')
    print(f"\nFound {count} replacement characters (U+FFFD)")
else:
    print("\nNo replacement characters found")

# 尝试用不同编码读取
for enc in ['utf-8', 'gbk', 'gb2312', 'latin-1']:
    try:
        test = raw.decode(enc)
        if '财务' in test or 'title' in test.lower():
            print(f"Encoding '{enc}' works: found relevant text")
            break
    except:
        pass
