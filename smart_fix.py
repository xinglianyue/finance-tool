#!/usr/bin/env python3
# Smart fix: restore broken regex and string patterns

import re

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'Original size: {len(content)}')

# Find all instances of broken patterns and fix them
# Pattern 1: .replace(/\n\n/g  -> should be .replace(/\n/g
broken_regexes = list(re.finditer(r'\.replace\(/\\n\s*\n?/g', content))
print(f'Found {len(broken_regexes)} broken regex patterns')

for m in broken_regexes:
    print(f'  At {m.start()}: {repr(m.group(0)[:50])}')
    # Replace with correct pattern
    content = content[:m.start()] + '.replace(/\\n/g' + content[m.end():]
    print(f'  Fixed to: .replace(/\\\\n/g')

# Pattern 2: logs.join(' followed by newline and ');
# This was the original issue - need to restore \n in strings
broken_strings = list(re.finditer(r"\.join\('\s*\n\s*'\)", content))
print(f'\nFound {len(broken_strings)} broken string join patterns')

for m in broken_strings:
    print(f'  At {m.start()}: {repr(m.group(0)[:50])}')
    # Replace with correct pattern
    content = content[:m.start()] + ".join('\\n')" + content[m.end():]
    print(f'  Fixed to: .join(\'\\\\n\')')

# Write fixed content
output_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html.SMART_FIXED'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nWritten to: {output_path}')
print(f'Final size: {len(content)}')

# Verify
open_b = content.count('{')
close_b = content.count('}')
print(f'Brace balance: {open_b} open, {close_b} close, diff {open_b - close_b}')

# Check for remaining issues
remaining_regex = len(re.findall(r'\.replace\(/\\n\s*\n?/g', content))
remaining_string = len(re.findall(r"\.join\('\s*\n\s*'\)", content))
print(f'Remaining broken regex patterns: {remaining_regex}')
print(f'Remaining broken string patterns: {remaining_string}')