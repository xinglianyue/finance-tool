#!/usr/bin/env python3
# SAFE fix - only make minimal necessary changes

import re

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html.bak_v3', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'Loaded backup: {len(content)} chars')
print(f'Initial brace diff: {content.count(chr(123)) - content.count(chr(125))}')

# Only fix what's absolutely necessary
# 1. Add async to functions that need it (if missing)
async_funcs = ['loadFromCloud', 'switchImportDate', 'checkCloudForUpdates']
for func in async_funcs:
    if f'async function {func}(' not in content and f'function {func}(' in content:
        # Find and replace the first occurrence only
        pattern = r'(function\s+' + re.escape(func) + r'\s*\()'
        replacement = r'async \1'
        content = re.sub(pattern, replacement, content, count=1)
        print(f'Added async to {func}')

# 2. Check brace balance after changes
open_b = content.count('{')
close_b = content.count('}')
diff = open_b - close_b
print(f'Brace diff after changes: {diff}')

# Write and verify
output_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html.SAFE_FIX'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nWritten to: {output_path}')
print(f'Final size: {len(content)} chars')

# Final checks
print('\n=== FINAL CHECK ===')
print('Brace diff:', content.count('{') - content.count('}'))
print('Literal \\n:', content.count('\\n'))

funcs = ['switchTab', 'updateVersion', 'loadFromCloud', 'switchImportDate', 
         'checkCloudForUpdates', 'buildV3Data', 'parseRecord']
for func in funcs:
    has_it = (f'function {func}(' in content) or (f'async function {func}(' in content)
    print(f'{func}: {"OK" if has_it else "MISSING"}')