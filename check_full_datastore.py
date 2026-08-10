# -*- coding: utf-8 -*-
"""Check the full DataStore implementation in HTML"""
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print("=" * 60)
print("Checking DataStore Implementation")
print("=" * 60)

# Find all DataStore related code
lines = content.split('\n')
in_ds_script = False
ds_lines = []
start_line = 0

for i, line in enumerate(lines, start=1):
    if 'DataStore fallback' in line or 'DataStore complete initialized' in line or 'DataStore Initialization' in line:
        in_ds_script = True
        start_line = i
        ds_lines = [line]
    elif in_ds_script:
        ds_lines.append(line)
        if '</script>' in line:
            print(f"\n[DataStore script found at lines {start_line}-{i}]")
            print("-" * 60)
            print('\n'.join(ds_lines[:30]))  # First 30 lines
            if len(ds_lines) > 30:
                print(f"... ({len(ds_lines) - 30} more lines)")
            print("-" * 60)
            in_ds_script = False
            ds_lines = []

# Check for key methods
methods_to_check = ['load', 'save', 'getCache', 'setCache', 'clear']
print("\nMethod checks:")
for method in methods_to_check:
    count = content.count(f'{method}: function')
    print(f"  {method}(): {count} occurrence(s)")

# Check version
import re
v = re.search(r"APP_VERSION = '(\d+)'", content)
if v:
    print(f"\nAPP_VERSION: {v.group(1)}")

print("\n" + "=" * 60)
