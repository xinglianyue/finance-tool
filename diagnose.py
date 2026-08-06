# -*- coding: utf-8 -*-
import os
import re

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "rb") as f:
    raw = f.read()

content = raw.decode('utf-8', errors='replace')

print("File size:", len(content))
print("BOM present:", raw[:3] == b'\xef\xbb\xbf')

# Check for common corruption patterns
corrupted = content.count('\ufffd')
print("Replacement chars:", corrupted)

# Check title
lines = content.split('\n')
for i, line in enumerate(lines[:20], start=1):
    if 'title' in line.lower():
        print(f"Title line {i}: {line[:80]}")

# Check version
for line in lines:
    if 'APP_VERSION' in line:
        print("Version:", line.strip())
        
print("\nStatus: Ready to fix")
