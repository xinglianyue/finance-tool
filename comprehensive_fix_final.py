#!/usr/bin/env python3
# Comprehensive analysis and fix of index-new.html

import re
import sys

# Read the current committed version from git
import subprocess
result = subprocess.run(
    ['git', 'show', 'HEAD:index-new.html'],
    capture_output=True,
    text=True,
    cwd=r'C:\Users\xinxi\Desktop\财务工具'
)

if result.returncode != 0:
    print('Error reading from git:', result.stderr)
    sys.exit(1)

content = result.stdout
print(f'Loaded from git HEAD: {len(content)} chars')

# Analyze issues
issues = []

# 1. Check brace balance
open_b = content.count('{')
close_b = content.count('}')
diff = open_b - close_b
if diff != 0:
    issues.append(f'Brace imbalance: diff={diff}')

# 2. Check for literal backslash-n outside strings/regex
lines = content.split('\n')
for i, line in enumerate(lines):
    # Check for patterns that indicate broken code
    if '.replace(/\\n' in line and not line.rstrip().endswith('/g'):
        issues.append(f'Line {i+1}: Broken regex pattern')
    if ".join('" in line and line.rstrip().endswith("join('"):
        issues.append(f'Line {i+1}: Broken string join')

# 3. Check for missing async declarations
async_funcs = ['loadFromCloud', 'switchImportDate', 'checkCloudForUpdates']
for func in async_funcs:
    if f'async function {func}(' not in content:
        if f'function {func}(' in content:
            issues.append(f'{func} missing async declaration')

# 4. Check for duplicate functions
funcs_to_check = ['parseRecord', 'buildV3Data', 'checkCloudForUpdates']
for func in funcs_to_check:
    count = len(re.findall(rf'function\s+{func}\s*\(', content))
    if count > 1:
        issues.append(f'{func} has {count} definitions (should be 1)')

print('\n=== ISSUES FOUND ===')
if issues:
    for issue in issues:
        print(f'  - {issue}')
else:
    print('  No issues found!')

# Now attempt fixes
print('\n=== APPLYING FIXES ===')

# Fix 1: Add missing async declarations
for func in async_funcs:
    if f'async function {func}(' not in content:
        content = content.replace(
            f'function {func}(',
            f'async function {func}(',
            1
        )
        print(f'  Added async to {func}')

# Fix 2: Remove extra closing braces if needed
if diff < 0:
    # Find and remove extra } characters near the end
    target_remove = abs(diff)
    # Work backwards from end
    pos = len(content) - 1
    removed = 0
    new_content = list(content)
    while removed < target_remove and pos >= 0:
        if new_content[pos] == '}':
            # Check if this is a safe place to remove
            # Look ahead to see if next non-whitespace is } or end
            remaining = ''.join(new_content[pos+1:]).lstrip()
            if remaining == '' or remaining[0] == '}':
                new_content[pos] = ''
                removed += 1
                print(f'  Removed extra }} at position {pos}')
        pos -= 1
    content = ''.join(new_content)

# Fix 3: Handle broken regex and string patterns
# Pattern: .replace(/\\n followed by newline then /g
broken_regex = re.findall(r'\.replace\(/\\n\s*\n/g', content)
if broken_regex:
    print(f'  Found {len(broken_regex)} broken regex patterns')
    content = re.sub(r'\.replace\(/\\n\s*\n/g', '.replace(/\\n/g', content)

# Pattern: .join(' split across lines  
broken_string = re.findall(r"\.join\('\s*\n\s*'\)", content)
if broken_string:
    print(f'  Found {len(broken_string)} broken string patterns')
    content = re.sub(r"\.join\('\s*\n\s*'\)", ".join('\\n')", content)

# Write fixed version
output_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html.FIXED_FINAL'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nWritten to: {output_path}')
print(f'Final size: {len(content)} chars')

# Verify
print('\n=== FINAL VERIFICATION ===')
print(f'Brace diff: {content.count(chr(123)) - content.count(chr(125))}')
print(f'Literal backslash-n: {content.count(chr(92)+chr(110))}')

for func in ['switchTab', 'updateVersion', 'loadFromCloud', 'switchImportDate', 
             'checkCloudForUpdates', 'buildV3Data', 'parseRecord']:
    has_it = f'function {func}(' in content or f'async function {func}(' in content
    print(f'{func}: {"OK" if has_it else "MISSING"}')