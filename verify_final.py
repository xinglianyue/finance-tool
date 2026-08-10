# -*- coding: utf-8 -*-
"""最终验证 - 检查所有关键元素"""
import sys
import io
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

html_path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"
ds_path = r"C:\Users\xinxi\Desktop\财务工具\js\data-store.js"

print("=" * 60)
print("Final Verification")
print("=" * 60)

# Check HTML
with open(html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

print(f"\n[HTML File]")
print(f"  Size: {len(html_content)} chars")

# Check version
v = re.search(r"APP_VERSION = '(\d+)'", html_content)
if v:
    print(f"  APP_VERSION: {v.group(1)} ✓")
else:
    print(f"  APP_VERSION: NOT FOUND ✗")

# Check inline DataStore position
if 'window.DataStore = {' in html_content:
    ds_pos = html_content.find('window.DataStore = {')
    body_end = html_content.find('</body>')
    if body_end > ds_pos > body_end - 2000:
        print(f"  Inline DataStore position: NEAR </body> ✓")
    else:
        print(f"  Inline DataStore position: Line ~{html_content[:ds_pos].count(chr(10))} (may be too early)")
else:
    print(f"  Inline DataStore: NOT FOUND ✗")

# Check data-store.js
with open(ds_path, "r", encoding="utf-8") as f:
    ds_content = f.read()

print(f"\n[data-store.js]")
print(f"  Size: {len(ds_content)} bytes")

if 'if (!window.DataStore)' in ds_content:
    print(f"  Has conditional check: YES ✓")
else:
    print(f"  Has conditional check: NO ✗")

print("\n" + "=" * 60)
print("Git commit and push:")
print("  git add -A && git commit -m 'fix: final DataStore fix' && git push")
print("=" * 60)
