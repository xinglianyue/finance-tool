# -*- coding: utf-8 -*-
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding='utf-8', errors='replace') as f:
    content = f.read()

print("Remaining garbled patterns:\n")

# Find all lines with common garbled patterns
garbled_chars = ['鐗', '鏁', '鎵', '閾', '鍔', '璐', '缃', '鍩', '甯', '鍘', '鍖']

lines_with_garbled = []
for i, line in enumerate(content.split('\n'), start=1):
    for char in garbled_chars:
        if char in line:
            lines_with_garbled.append((i, line[:100]))
            break

print(f"Found {len(lines_with_garbled)} lines with potential garbled text:\n")
for line_num, preview in lines_with_garbled[:20]:
    print(f"Line {line_num}: {preview}")
