# -*- coding: utf-8 -*-
"""Remove duplicate DataStore fallback and ensure only one initialization"""
import sys
import io
import re
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"Original size: {len(content)} chars")
print(f"Total lines: {len(content.split(chr(10)))}")

# Generate new timestamp
new_ts = str(int(time.time()))
print(f"New version: {new_ts}")

# Remove ALL DataStore fallback scripts at the end
# Look for patterns like "<!-- DataStore fallback -->" or similar comments
content = re.sub(r'<!--.*?DataStore.*?fallback.*?-->\s*<script>.*?</script>\s*', '', content, flags=re.DOTALL)
content = re.sub(r'<!--.*?DataStore.*?-->.*?<script>.*?</script>', '', content, flags=re.DOTALL)

# Also remove any other DataStore-related scripts that might conflict
content = re.sub(r'<script>.*?if \(!window\.DataStore.*?</script>', '', content, flags=re.DOTALL)

print("✓ Removed duplicate DataStore fallback scripts")

# Check if the main DataStore init is still present
if 'window.DataStore = {' in content:
    print("✓ Main DataStore initialization is present")
else:
    print("✗ ERROR: Main DataStore initialization missing!")
    sys.exit(1)

# Update versions
content = re.sub(r"APP_VERSION = '\d+'", f"APP_VERSION = '{new_ts}'", content)
content = re.sub(r'v=\d+', f'v={new_ts}', content)
print(f"✓ Updated versions to {new_ts}")

# Save file
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✓ Saved! New size: {len(content)} chars")

# Verify
with open(path, "r", encoding="utf-8") as f:
    verify = f.read()
    
# Count DataStore occurrences
ds_count = verify.count('window.DataStore = {')
print(f"\nDataStore assignments found: {ds_count}")

if ds_count == 1:
    print("✓ Perfect! Only one DataStore initialization")
else:
    print(f"⚠ Warning: Found {ds_count} DataStore initializations (expected 1)")

# Check for key methods
methods = ['load', 'save', 'getCache', 'setCache', 'clear']
for method in methods:
    if f'{method}: function' in verify or f'{method}: function' in verify:
        print(f"  ✓ Method {method}() is present")
    else:
        print(f"  ✗ Method {method}() missing")

# Check Chinese title
if '财务分析工具' in verify and '美团代理商专用' in verify:
    print("  ✓ Chinese title is correct")
else:
    print("  ✗ Chinese title may be corrupted")

print(f"\nVersion: {new_ts}")
print("\nNext steps:")
print("  git add index-new.html")
print("  git commit -m 'fix: remove duplicate DataStore fallback'")
print("  git push")
