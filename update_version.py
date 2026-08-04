# -*- coding: utf-8 -*-
"""更新版本号到最新时间戳"""
import time
import os

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"
new_version = str(int(time.time()))

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 替换所有旧版本号为新时间戳
old_v1 = "1785814622"
content = content.replace(f"v={old_v1}", f"v={new_version}")
content = content.replace(f"'{old_v1}'", f"'{new_version}'")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"OK - Version updated to {new_version}")
print("Now commit and push:")
print("  git add .")
print("  git commit -m \"fix: force cache refresh v{}\"".format(new_version))
print("  git push")
