#!/usr/bin/env python3
# Compare files and find differences

import sys

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html.bak_v3', 'r', encoding='utf-8') as f:
    backup = f.read()

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html.git', 'r', encoding='utf-8') as f:
    git_ver = f.read()

print('Backup size:', len(backup))
print('Git version size:', len(git_ver))
print('\nKey differences:')

# Find line numbers for critical functions in both versions
def find_func_line(content, func_name):
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if f'function {func_name}' in line or f'async function {func_name}' in line:
            return i + 1, line[:80]
    return None, None

funcs = ['switchTab', 'updateVersion', 'loadFromCloud', 'switchImportDate', 'checkCloudForUpdates']
for func in funcs:
    bak_line, bak_text = find_func_line(backup, func)
    git_line, git_text = find_func_line(git_ver, func)
    if bak_line != git_line or bak_text != git_text:
        print(f'{func}:')
        print(f'  Backup: line {bak_line} - {bak_text}')
        print(f'  Git:    line {git_line} - {git_text}')

# Check brace balance
print(f'\nBrace balance:')
print(f'  Backup: open={backup.count(chr(123))}, close={backup.count(chr(125))}, diff={backup.count(chr(123))-backup.count(chr(125))}')
print(f'  Git:    open={git_ver.count(chr(123))}, close={git_ver.count(chr(125))}, diff={git_ver.count(chr(123))-git_ver.count(chr(125))}')