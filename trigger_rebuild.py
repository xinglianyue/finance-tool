# -*- coding: utf-8 -*-
"""创建一个微小的更改以触发重新部署"""
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 更新时间戳
new_ts = str(int(time.time()))
old_ts = "1786007402"

if old_ts in content:
    content = content.replace(old_ts, new_ts)
    print(f"Updated version: {old_ts} -> {new_ts}")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("File saved!")
else:
    print("Version not found, no change made")

print("\nRun: git add index-new.html && git commit -m 'trigger: rebuild' && git push")
