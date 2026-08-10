# -*- coding: utf-8 -*-
"""Check git status of data-store.js"""
import sys
import io
import subprocess

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Check local file
local_path = r"C:\Users\xinxi\Desktop\财务工具\js\data-store.js"
with open(local_path, "r", encoding="utf-8") as f:
    local_content = f.read()

print(f"Local file size: {len(local_content)} bytes")
print(f"Local lines: {len(local_content.split(chr(10)))}")

# Check if conditional exists
if 'if (!window.DataStore)' in local_content:
    print("✓ Local file has conditional check")
else:
    print("✗ Local file MISSING conditional check")

# Get git info using Python
import hashlib
local_md5 = hashlib.md5(local_content.encode('utf-8')).hexdigest()
print(f"Local MD5: {local_md5}")

# Run git commands
result = subprocess.run(['git', '-C', r'C:\Users\xinxi\Desktop\财务工具', 'diff', 'HEAD', '--', 'js/data-store.js'], 
                       capture_output=True, text=True, encoding='utf-8')
print("\nGit diff output:")
print(result.stdout[:1000] if result.stdout else "(no diff)")
print(result.stderr[:500] if result.stderr else "")

print("\nGit status:")
result2 = subprocess.run(['git', '-C', r'C:\Users\xinxi\Desktop\财务工具', 'status', '--short', 'js/data-store.js'], 
                        capture_output=True, text=True, encoding='utf-8')
print(result2.stdout)
