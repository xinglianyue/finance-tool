# -*- coding: utf-8 -*-
"""强制清除所有缓存"""
import sys
import io
import re
import time
import subprocess

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 70)
print("强制清除所有缓存")
print("=" * 70)

html_path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"
ds_path = r"C:\Users\xinxi\Desktop\财务工具\js\data-store.js"
sm_path = r"C:\Users\xinxi\Desktop\财务工具\js\state-manager.js"

# 生成全新版本号
new_ts = str(int(time.time()))
print(f"\n全新版本号: {new_ts}")

# 1. 更新 index-new.html 版本号
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(r"APP_VERSION = '\d+'", f"APP_VERSION = '{new_ts}'", content)
content = re.sub(r'v=\d+', f'v={new_ts}', content)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✓ 已更新 index-new.html 版本号为 {new_ts}")

# 2. 验证所有文件存在且正确
files_to_check = [
    (html_path, "index-new.html"),
    (ds_path, "data-store.js"),
    (sm_path, "state-manager.js"),
]

print(f"\n验证所有文件:")
for path, name in files_to_check:
    import os
    if os.path.exists(path):
        size = os.path.getsize(path)
        print(f"  ✓ {name}: {size:,} bytes")
    else:
        print(f"  ✗ {name}: 文件不存在!")

# 3. Git 提交和推送
print(f"\n执行 Git 操作...")
result = subprocess.run(['git', '-C', r'C:\Users\xinxi\Desktop\财务工具', 'add', '.'], 
                       capture_output=True, text=True)
if result.returncode == 0:
    print("  ✓ git add 成功")

commit_msg = f"fix: 强制清除所有缓存 - 更新版本号 v{new_ts}"
result = subprocess.run(['git', '-C', r'C:\Users\xinxi\Desktop\财务工具', 'commit', '-m', commit_msg], 
                       capture_output=True, text=True)
if result.returncode == 0:
    print(f"  ✓ git commit 成功")
else:
    print(f"  ⚠ git commit 警告: {result.stderr[:200]}")

result = subprocess.run(['git', '-C', r'C:\Users\xinxi\Desktop\财务工具', 'push'], 
                       capture_output=True, text=True)
if result.returncode == 0:
    print("  ✓ git push 成功")
else:
    print(f"  ✗ git push 失败: {result.stderr[:200]}")

print("\n" + "=" * 70)
print("完成！请测试以下 URL:")
print(f"https://xinglianyue.github.io/finance-tool/index-new.html")
print("=" * 70)
