# -*- coding: utf-8 -*-
"""Final verification - all checks"""
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 60)
print("FINAL VERIFICATION REPORT")
print("=" * 60)

# 1. Check local file
local_path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"
with open(local_path, "rb") as f:
    local_raw = f.read()

print(f"\n[Local File]")
print(f"  Size: {len(local_raw)} bytes")
title = local_raw[local_raw.find(b'<title'):local_raw.find(b'</title>')+8].decode('utf-8')
print(f"  Title: {title}")
print(f"  Valid UTF-8: {'YES' if '财务' in title else 'NO'}")

# 2. Check data-store.js
ds_path = r"C:\Users\xinxi\Desktop\财务工具\js\data-store.js"
with open(ds_path, "r", encoding="utf-8") as f:
    ds = f.read()

print(f"\n[data-store.js]")
print(f"  Has conditional export: {'YES' if 'if (!window.DataStore)' in ds else 'NO'}")
print(f"  Has class DataStore: {'YES' if 'class DataStore' in ds else 'NO'}")

print("\n" + "=" * 60)
print("URL: https://xinglianyue.github.io/finance-tool/index-new.html")
print("Please test with: Ctrl+Shift+N (incognito mode)")
print("=" * 60)
