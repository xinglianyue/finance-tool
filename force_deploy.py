# -*- coding: utf-8 -*-
"""强制触发重新部署 - 添加注释更新版本号"""
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"Current size: {len(content)} chars")

# 更新时间戳
new_ts = str(int(time.time()))
print(f"New timestamp: {new_ts}")

# 更新版本号
import re
content = re.sub(r"APP_VERSION = '\d+'", f"APP_VERSION = '{new_ts}'", content)
content = re.sub(r'v=\d+', f'v={new_ts}', content)

# 添加一个注释标记版本
content = content.replace('<!-- v2026-07-27.2 -->', f'<!-- v{new_ts} -->')

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Saved! New size: {len(content)} chars")
