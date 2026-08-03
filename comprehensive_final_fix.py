#!/usr/bin/env python3
# Comprehensive final fix addressing all identified issues

import re

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'Original size: {len(content)}')

# Issue 1: Fix broken regex patterns
# Pattern: .replace(/\\n\n/g, '') should be .replace(/\\n/g, '')
broken_regexes = list(re.finditer(r'\.replace\(/\\n\s*\n/g', content))
print(f'Found {len(broken_regexes)} broken regex patterns')

for m in broken_regexes:
    print(f'  Fixed at position {m.start()}')
    # Replace with correct regex (without the extra newline)
    content = content[:m.start()] + '.replace(/\\n/g' + content[m.end():]

# Issue 2: Fix broken string join patterns
# Pattern: .join('\n') split across lines should be .join('\\n')
broken_strings = list(re.finditer(r"\.join\('?\s*\n\s*'?;", content))
print(f'Found {len(broken_strings)} broken string patterns')

for m in broken_strings:
    print(f'  Fixed at position {m.start()}')
    # Check what the original was and fix it
    start = m.start()
    # Look back to find the join( pattern
    join_start = content.rfind('.join(', 0, start)
    if join_start >= 0:
        # Reconstruct the correct string
        before_join = content[:join_start]
        after_join = content[start+m.end():]
        content = before_join + ".join('\\n');" + after_join

# Issue 3: Verify switchTab function is properly defined
if 'function switchTab' not in content:
    print('ERROR: switchTab function not found!')
else:
    print('switchTab function: OK')

# Issue 4: Ensure all async functions are properly declared
async_funcs = ['loadFromCloud', 'switchImportDate', 'checkCloudForUpdates']
for func in async_funcs:
    if f'async function {func}' in content:
        print(f'{func}: async declaration OK')
    else:
        print(f'{func}: MISSING async declaration - fixing...')
        # Add async if needed
        content = content.replace(
            f'function {func}(',
            f'async function {func}(',
            1
        )

# Final verification
open_b = content.count('{')
close_b = content.count('}')
diff = open_b - close_b
print(f'\n=== VERIFICATION ===')
print(f'Brace balance: {open_b} open, {close_b} close, diff {diff}')

remaining_regex = len(re.findall(r'\.replace\(/\\n\s*\n/g', content))
remaining_string = len(re.findall(r"\.join\('?\s*\n\s*'?;", content))
print(f'Remaining broken regex: {remaining_regex}')
print(f'Remaining broken strings: {remaining_string}')

# Write output
output_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html.COMPLETE_FIX'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nWritten to: {output_path}')
print(f'Final size: {len(content)}')