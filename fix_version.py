# -*- coding: utf-8 -*-
"""修复损坏的版本号"""
import time
import re

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"
new_version = str(int(time.time()))

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 修复错误的版本
content = content.replace("var APP_VERSION = 'UnixTi25e';", f"var APP_VERSION = '{new_version}';")

# 同时修复脚本版本号
content = content.replace("v=1785821154", f"v={new_version}")
content = content.replace("v=1785814622", f"v={new_version}")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"OK - Fixed version to {new_version}")
print(f"File size: {len(content)} chars")
