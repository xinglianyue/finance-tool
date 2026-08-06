# -*- coding: utf-8 -*-
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "rb") as f:
    raw = f.read()

print(f"File size: {len(raw)} bytes")

# 查找所有 <title 出现的位置
import re
matches = list(re.finditer(rb'<title', raw))
print(f"\nFound {len(matches)} '<title' occurrences:")
for i, m in enumerate(matches):
    start = max(0, m.start() - 10)
    end = min(len(raw), m.end() + 80)
    chunk = raw[start:end]
    try:
        text = chunk.decode('utf-8')
        print(f"  Match {i+1} at offset {m.start()}:")
        print(f"    {repr(text)}")
    except Exception as e:
        print(f"  Match {i+1} at offset {m.start()}: DECODE ERROR - {e}")

# 检查字节 478 附近的原始内容
print(f"\nBytes around offset 478:")
chunk = raw[470:550]
print(f"  Raw hex: {chunk.hex()}")
try:
    print(f"  As UTF-8: {repr(chunk.decode('utf-8'))}")
except Exception as e:
    print(f"  Decode error: {e}")
