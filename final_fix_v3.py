#!/usr/bin/env python3
# Final fix - read directly from git

import re

# Read the committed version
with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.git.version', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'Loaded: {len(content)} chars')

# Analyze
print(f'\nInitial analysis:')
print(f'  Brace diff: {content.count(chr(123)) - content.count(chr(125))}')
print(f'  Literal backslash-n: {content.count(chr(92)+chr(110))}')

# Fix 1: Add async to switchImportDate if missing
if 'async function switchImportDate(' not in content:
    if 'function switchImportDate(' in content:
        content = content.replace('function switchImportDate(', 'async function switchImportDate(', 1)
        print('\nAdded async to switchImportDate')

# Fix 2: Remove extra closing braces
open_b = content.count('{')
close_b = content.count('}')
diff = open_b - close_b

if diff == -2:
    print('\nRemoving 2 extra closing braces...')
    # Find last few } and remove them
    positions = [i for i, c in enumerate(content) if c == '}']
    # Remove the last 2
    for pos in positions[-2:]:
        content = content[:pos] + content[pos+1:]
    print('Removed 2 extra }')

# Verify
print(f'\nFinal analysis:')
print(f'  Brace diff: {content.count(chr(123)) - content.count(chr(125))}')
print(f'  Literal backslash-n: {content.count(chr(92)+chr(110))}')

# Write output
output_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html.FIXED_FINAL'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nWritten to: {output_path}')

# Check functions exist
funcs = ['switchTab', 'updateVersion', 'loadFromCloud', 'switchImportDate', 
         'checkCloudForUpdates', 'buildV3Data', 'parseRecord']
print('\nFunction check:')
for func in funcs:
    has_it = f'function {func}(' in content or f'async function {func}(' in content
    print(f'  {func}: {"OK" if has_it else "MISSING"}')