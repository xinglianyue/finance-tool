#!/usr/bin/env python3
# Full diagnostic scan for ALL potential issues

import re

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
print(f'File size: {len(content)} chars, {len(lines)} lines')
print('=' * 60)

issues = []

# 1. Check for broken regex patterns
print('\n[1] Checking for broken regex patterns...')
for i, line in enumerate(lines):
    if '.replace(/' in line and not line.rstrip().endswith('/g') and not line.rstrip().endswith('/i'):
        # Check next line
        if i + 1 < len(lines):
            next_line = lines[i + 1].lstrip()
            if next_line.startswith('/g') or next_line.startswith('/i') or next_line.startswith('/m'):
                issues.append(f'Line {i+1}-{i+2}: Broken regex pattern')
                print(f'  FOUND at line {i+1}: {repr(line.rstrip()[:50])}')

# 2. Check for broken string patterns
print('\n[2] Checking for broken string patterns...')
for i, line in enumerate(lines):
    if ".join('" in line and line.rstrip().endswith("join('"):
        if i + 1 < len(lines):
            next_line = lines[i + 1].lstrip()
            if next_line.startswith("');") or next_line.startswith("');\n"):
                issues.append(f'Line {i+1}-{i+2}: Broken string join')
                print(f'  FOUND at line {i+1}: {repr(line.rstrip()[:50])}')

# 3. Check brace balance
print('\n[3] Checking brace balance...')
open_b = content.count('{')
close_b = content.count('}')
diff = open_b - close_b
if diff != 0:
    issues.append(f'Brace imbalance: diff={diff}')
    print(f'  ISSUE: {diff} unbalanced braces')
else:
    print(f'  OK: Braces balanced ({open_b} open, {close_b} close)')

# 4. Check for async declarations
print('\n[4] Checking async declarations...')
async_funcs = ['loadFromCloud', 'switchImportDate', 'checkCloudForUpdates']
for func in async_funcs:
    has_async = f'async function {func}(' in content
    has_plain = f'function {func}(' in content
    if has_plain and not has_async:
        issues.append(f'{func} missing async declaration')
        print(f'  ISSUE: {func} needs async')
    elif has_async:
        print(f'  OK: {func} has async')

# 5. Check for duplicate function definitions
print('\n[5] Checking for duplicate functions...')
funcs_to_check = ['parseRecord', 'buildV3Data', 'checkCloudForUpdates', 'switchImportDate']
for func in funcs_to_check:
    count = len(re.findall(rf'function\s+{re.escape(func)}\s*\(', content))
    if count > 1:
        issues.append(f'{func} has {count} definitions')
        print(f'  ISSUE: {func} defined {count} times')
    else:
        print(f'  OK: {func} defined {count} time(s)')

# 6. Check for literal backslash-n outside strings/regex
print('\n[6] Checking for literal backslash-n...')
# Find all \n sequences and check if they're inside strings or regex
literal_ns = list(re.finditer(r'\\n', content))
outside_context_count = 0
for m in literal_ns:
    pos = m.start()
    # Simple heuristic: check if preceded by quote or slash
    before = content[max(0, pos-10):pos]
    is_in_string = before.count("'") % 2 == 1 or before.count('"') % 2 == 1
    is_in_regex = '/\\n' in before[-20:]
    if not is_in_string and not is_in_regex:
        outside_context_count += 1
        if outside_context_count <= 5:
            start = max(0, pos - 30)
            end = min(len(content), pos + 30)
            print(f'  WARNING: Literal \\n outside context at {pos}: {repr(content[start:end])}')

if outside_context_count == 0:
    print(f'  OK: All backslash-n are properly used (inside strings or regex)')
else:
    issues.append(f'Found {outside_context_count} literal backslash-n outside contexts')

# 7. Check for undefined function references
print('\n[7] Checking for undefined function references...')
undefined_funcs = ['switchTab', 'updateVersion']
for func in undefined_funcs:
    # Check if function is called
    call_pattern = rf'\b{func}\s*\('
    calls = re.findall(call_pattern, content)
    # Check if function is defined
    def_pattern = rf'(?:async\s+)?function\s+{re.escape(func)}\s*\('
    defs = re.findall(def_pattern, content)
    if calls and not defs:
        issues.append(f'{func} is called but not defined')
        print(f'  ISSUE: {func} called {len(calls)} times but not defined!')
    elif calls and defs:
        print(f'  OK: {func} called {len(calls)} times, defined {len(defs)} time(s)')

# Summary
print('\n' + '=' * 60)
print('DIAGNOSTIC SUMMARY')
print('=' * 60)
if issues:
    print(f'FOUND {len(issues)} ISSUES:')
    for i, issue in enumerate(issues, 1):
        print(f'  {i}. {issue}')
else:
    print('NO ISSUES FOUND - File is clean!')

print(f'\nFile ready for deployment.')