# -*- coding: utf-8 -*-
"""更新版本号到最新时间戳"""
import time
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 生成新时间戳
new_ts = str(int(time.time()))
print(f"New timestamp: {new_ts}")

# 替换所有旧版本号
old_versions = ['20260727.2', '1786009953', '1786007402', '1786006211']
for old in old_versions:
    if old in content:
        content = content.replace(old, new_ts)
        print(f"Replaced: {old} -> {new_ts}")

# 更新APP_VERSION
version_match = re.search(r"APP_VERSION = '(\d+)';", content)
if version_match:
    content = content.replace(version_match.group(0), f"APP_VERSION = '{new_ts}';")
    print(f"Updated APP_VERSION")

# 写入文件
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nFile size: {len(content)} chars")
print("\nRun: git add index-new.html && git commit -m 'fix: 更新版本号到最新时间戳' && git push")
