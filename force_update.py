# -*- coding: utf-8 -*-
"""强制更新版本号，确保浏览器加载最新代码"""

import os
import time

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"
timestamp = str(int(time.time()))

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 更新版本号
old_version = "var APP_VERSION = '20260727.2';"
new_version = f"var APP_VERSION = '{timestamp}';"

if old_version in content:
    content = content.replace(old_version, new_version)
    print(f"OK - 更新版本号到 {timestamp}")
else:
    print("WARN - 找不到版本号，尝试其他格式")
    # 尝试查找并替换
    import re
    match = re.search(r"var APP_VERSION = '[^']*';", content)
    if match:
        old = match.group(0)
        content = content.replace(old, new_version)
        print(f"OK - 正则匹配并替换: {old} -> {new_version}")
    else:
        print("ERROR - 无法找到版本号")

# 更新脚本缓存破坏版本
old_cache = "v=1785809667"
new_cache = f"v={timestamp}"

if old_cache in content:
    content = content.replace(old_cache, new_cache)
    print(f"OK - 更新缓存版本号到 {timestamp}")
else:
    print("WARN - 找不到旧缓存版本")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\n完成! 文件已保存 ({len(content)} chars)")
print(f"请运行: git add -A && git commit -m \"fix: 强制刷新所有缓存\" && git push")
