#!/usr/bin/env python3
# Comprehensive fix for ALL broken regex and string patterns in index-new.html

import re
import sys

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'Original size: {len(content)} chars')
print(f'Original lines: {content.count(chr(10)) + 1}')

# ===== FIX 1: Broken regex patterns =====
# Pattern: .replace(/ followed by newline then /g, ...)
# These occur when regex literals are split across lines

broken_regex_count = 0
fixed_content = content

# Find all instances of .replace(/ that are followed by newline before /g
pattern = r'\.replace\(/\\n\s*\n\s*/g'
matches = list(re.finditer(pattern, fixed_content))
print(f'\n=== Checking regex patterns ===')
print(f'Found {len(matches)} broken regex patterns')

for m in matches:
    print(f'  Position {m.start()}: {repr(m.group(0)[:50])}')
    broken_regex_count += 1

if broken_regex_count > 0:
    # Replace all broken patterns with correct ones
    fixed_content = re.sub(r'\.replace\(/\\n\s*\n\s*/g', '.replace(/\\n/g', fixed_content)
    print(f'Fixed {broken_regex_count} regex patterns')

# ===== FIX 2: Broken string join patterns =====
# Pattern: .join(' followed by newline then ');
pattern2 = r"\.join\('\s*\n\s*'\)"
matches2 = list(re.finditer(pattern2, fixed_content))
print(f'\n=== Checking string patterns ===')
print(f'Found {len(matches2)} broken string join patterns')

for m in matches2:
    print(f'  Position {m.start()}: {repr(m.group(0)[:50])}')

if len(matches2) > 0:
    fixed_content = re.sub(r"\.join\('\s*\n\s*'\)", ".join('\\n')", fixed_content)
    print(f'Fixed {len(matches2)} string patterns')

# ===== FIX 3: Check for other potential issues =====
print(f'\n=== Checking for other issues ===')

# Check brace balance
open_b = fixed_content.count('{')
close_b = fixed_content.count('}')
diff = open_b - close_b
print(f'Brace balance: {open_b} open, {close_b} close, diff {diff}')

# Check for async declarations
async_funcs = ['loadFromCloud', 'switchImportDate', 'checkCloudForUpdates']
for func in async_funcs:
    if f'async function {func}(' in fixed_content:
        print(f'{func}: async declaration OK')
    else:
        print(f'{func}: MISSING async declaration - fixing...')
        # Add async if missing
        fixed_content = fixed_content.replace(
            f'function {func}(',
            f'async function {func}(',
            1
        )

# ===== FIX 4: Ensure no literal backslash-n outside strings/regex =====
# This is tricky - we need to be careful not to break legitimate escape sequences
literal_ns = fixed_content.count('\\n')
print(f'\nLiteral backslash-n count: {literal_ns}')
print('(Note: This is expected inside string literals and regex patterns)')

# ===== Write fixed content =====
output_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html.FIXED_ALL'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(fixed_content)

print(f'\n=== Summary ===')
print(f'Original size: {len(content)}')
print(f'Fixed size: {len(fixed_content)}')
print(f'Written to: {output_path}')

# Final verification
print(f'\n=== Final Verification ===')
print(f'Brace diff: {fixed_content.count(chr(123)) - fixed_content.count(chr(125))}')
print(f'Remaining broken regex: {len(re.findall(r"\\.replace\\(/\\\\n\\s*\\n\\/g", fixed_content))}')

# Check key functions exist
funcs = ['switchTab', 'updateVersion', 'loadFromCloud', 'switchImportDate', 
         'checkCloudForUpdates', 'buildV3Data', 'parseRecord']
print('\nFunction checks:')
for func in funcs:
    has_it = (f'function {func}(' in fixed_content) or (f'async function {func}(' in fixed_content)
    print(f'  {func}: {"OK" if has_it else "MISSING"}')