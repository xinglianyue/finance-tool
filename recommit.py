# -*- coding: utf-8 -*-
"""重新提交文件以确保正确编码"""
import sys
import io
import hashlib

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "rb") as f:
    raw = f.read()

print(f"File size: {len(raw)} bytes")
print(f"MD5: {hashlib.md5(raw).hexdigest()}")

# 检查是否有BOM
has_bom = raw[:3] == b'\xef\xbb\xbf'
print(f"Has BOM: {has_bom}")

# 尝试解码为UTF-8
try:
    content = raw.decode('utf-8')
    print("✓ File is valid UTF-8")
    
    # 检查中文
    if '财务分析工具' in content:
        print("✓ Chinese title is correct")
    else:
        print("✗ Chinese title is corrupted")
        
except UnicodeDecodeError as e:
    print(f"✗ UTF-8 decode error: {e}")

print("\nNow checking git diff...")
print("Run: git add index-new.html && git commit -m 'fix: ensure correct encoding' && git push")
