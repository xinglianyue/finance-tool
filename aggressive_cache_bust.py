# -*- coding: utf-8 -*-
"""激进缓存清除 - 使用完全不同的版本号"""
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 使用一个全新的、完全不同的版本号
new_version = f"9{int(time.time())}"  # 在时间戳前加9，确保完全不同
print(f"New aggressive version: {new_version}")

# 替换所有旧版本号（包括各种格式）
replacements = [
    ('20260727.2', new_version),
    ('1786158099', new_version),
    ('1786158099', new_version),  # 重复确保替换
    ('APP_VERSION = ', f"APP_VERSION = '{new_version}'; "),
]

for old, new in replacements:
    content = content.replace(old, new)

# 确保script标签也使用新版本号
import re
content = re.sub(r'v=\d+', f'v={new_version}', content)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"File size: {len(content)} chars")
print("\nCommit and push:")
print(f"  git add index-new.html && git commit -m 'fix: aggressive cache bust v{new_version}' && git push")
