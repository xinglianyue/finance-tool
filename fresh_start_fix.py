#!/usr/bin/env python3
# Fresh start: rebuild from backup with all fixes applied carefully

import re

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html.bak_v3', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'Loaded backup: {len(content)} chars')

# Step 1: Check for literal backslash-n sequences (not in strings or regex)
# This is tricky - we need to be careful not to modify actual string/regex content

# Let's analyze the file more carefully
lines = content.split('\n')
issues_found = []

for i, line in enumerate(lines):
    line_num = i + 1
    
    # Check for broken regex pattern: .replace(/\n followed by actual newline
    if '.replace(/\\n' in line and not line.rstrip().endswith('/g'):
        # This might be a broken regex - check next line
        if i + 1 < len(lines):
            next_line = lines[i + 1].lstrip()
            if next_line.startswith('/g'):
                issues_found.append((line_num, 'Broken regex', f'{repr(line[-20:])}...{repr(next_line[:20])}'))
    
    # Check for broken string: .join(' followed by actual newline  
    if ".join('" in line and line.rstrip().endswith("join('"):
        if i + 1 < len(lines):
            next_line = lines[i + 1].lstrip()
            if next_line.startswith("');"):
                issues_found.append((line_num, 'Broken string join', f'{repr(line[-20:])}...{repr(next_line[:20])}'))

print(f'\nFound {len(issues_found)} issues:')
for line_num, issue_type, context in issues_found:
    print(f'  Line {line_num} ({issue_type}): {context}')

# Now apply fixes if any found
if issues_found:
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check if this line has a broken regex
        if '.replace(/\\n' in line and not line.rstrip().endswith('/g'):
            if i + 1 < len(lines):
                next_line = lines[i + 1].lstrip()
                if next_line.startswith('/g'):
                    # Merge and fix
                    merged = line.rstrip() + '\\n' + next_line
                    new_lines.append(merged)
                    print(f'Fixed broken regex at line {i+1}')
                    i += 2
                    continue
        
        # Check if this line has a broken string join
        if ".join('" in line and line.rstrip().endswith("join('"):
            if i + 1 < len(lines):
                next_line = lines[i + 1].lstrip()
                if next_line.startswith("');"):
                    # Merge and fix
                    merged = line.rstrip() + '\\n' + next_line.lstrip()[1:]  # Remove leading ');'
                    new_lines.append(merged + ';')
                    print(f'Fixed broken string at line {i+1}')
                    i += 2
                    continue
        
        new_lines.append(line)
        i += 1
    
    content = '\n'.join(new_lines)
else:
    print('No issues found - file appears clean')

# Additional check: ensure async declarations are correct
async_funcs = ['loadFromCloud', 'switchImportDate', 'checkCloudForUpdates']
for func in async_funcs:
    if f'async function {func}' not in content:
        if f'function {func}(' in content:
            content = content.replace(f'function {func}(', f'async function {func}(', 1)
            print(f'Added async to {func}')

# Verify brace balance
open_b = content.count('{')
close_b = content.count('}')
diff = open_b - close_b
print(f'\nFinal brace balance: {open_b} open, {close_b} close, diff {diff}')

# Write output
output_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html.FRESH_FIX'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nWritten to: {output_path}')
print(f'Final size: {len(content)}')

# Final verification
print('\n=== FINAL CHECK ===')
print('Literal backslash-n count:', content.count('\\n'))
print('Brace diff:', content.count('{') - content.count('}'))

funcs_to_check = ['switchTab', 'updateVersion', 'loadFromCloud', 'switchImportDate', 'checkCloudForUpdates', 'buildV3Data', 'parseRecord']
for func in funcs_to_check:
    count = len(re.findall(r'function\s+' + func + r'\s*\(', content))
    status = f'OK ({count})' if count >= 1 else 'MISSING!'
    print(f'{func}: {status}')