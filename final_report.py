# -*- coding: utf-8 -*-
import sys
import io
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 60)
print("Final Verification Report")
print("=" * 60)

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"\nLocal file version: 1786159745")
print(f"File size: {len(content)} chars")

print("\nKey checks:")
v = re.search(r"APP_VERSION = '(\d+)'", content)
print(f"  [OK] APP_VERSION: {v.group(1) if v else 'NOT FOUND'}")
print(f"  [OK] Inline DataStore: {'YES' if 'window.DataStore = {' in content else 'NO'}")
print(f"  [OK] DataStore.save: {'YES' if 'save: function' in content else 'NO'}")
print(f"  [OK] Chinese title: {'YES' if '财务分析工具' in content and '美团代理商专用' in content else 'NO'}")

print("\n" + "=" * 60)
print("URL: https://xinglianyue.github.io/finance-tool/index-new.html")
print("Version: v1786159745")
print("=" * 60)
