#!/usr/bin/env python3
# Fix the broken string literal issue

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Loaded {len(lines)} lines')

# Find and fix the broken string around line 1651
fixed_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # Check for the specific pattern of broken join(' at end of line
    if "logs.join('" in line and line.rstrip().endswith("join('"):
        # This line is broken - need to merge with next line
        print(f'Found broken string at line {i+1}')
        print(f'  Line {i+1}: {repr(line[:80])}')
        
        # Get the next line
        if i + 1 < len(lines):
            next_line = lines[i + 1]
            print(f'  Line {i+2}: {repr(next_line[:80])}')
            
            # Merge them properly - join(' + newline + ') should be join('\n')
            merged = line.rstrip() + '\\n' + next_line.lstrip()
            print(f'  Merged: {repr(merged[:80])}')
            fixed_lines.append(merged)
            i += 2  # Skip both lines
            continue
    
    fixed_lines.append(line)
    i += 1

print(f'\nOriginal lines: {len(lines)}')
print(f'Fixed lines: {len(fixed_lines)}')

# Write back
output_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html.FIXED_STRING'
with open(output_path, 'w', encoding='utf-8') as f:
    f.writelines(fixed_lines)

print(f'\nWritten to: {output_path}')

# Verify
with open(output_path, 'r', encoding='utf-8') as f:
    content = f.read()

print(f'Final size: {len(content)} chars')
print(f'Brace diff: {content.count(chr(123)) - content.count(chr(125))}')

# Check for any remaining issues
import re
if 'logs.join(\'\\n\')' in content:
    print('OK: String literal fixed correctly')
else:
    print('WARNING: String literal may not be fixed')