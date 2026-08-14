# -*- coding: utf-8 -*-
"""Update version and ensure DataStore is correct"""
import time
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"Current size: {len(content)} chars")

# Update version
new_ts = str(int(time.time()))
print(f"New version: {new_ts}")

content = re.sub(r"APP_VERSION = '\d+'", f"APP_VERSION = '{new_ts}'", content)
content = re.sub(r'v=\d+', f'v={new_ts}', content)

# Ensure DataStore early init is present
if 'window.DataStore = (function()' not in content:
    print("ERROR: DataStore initialization missing!")
else:
    print("DataStore initialization: OK")

# Save
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Saved! New size: {len(content)} chars")
