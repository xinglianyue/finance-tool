#!/usr/bin/env python3
# Final cleanup: Remove duplicate functions and fix syntax errors

import re

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

print('Original size:', len(content))

# Fix 1: Remove the duplicate parseRecord at line 5740
pattern1 = r'\n\n\nfunction parseRecord\(record\) \{[^}]*\}'
content = re.sub(pattern1, '', content)
print('Removed duplicate parseRecord')

# Fix 2: Remove the duplicate buildV3Data at line 5753
pattern2 = r'\n\n\nfunction buildV3Data\(cloudRecords, cloudIndex\) \{[\s\S]*?return \{ version: 3[^\}]*\};'
content = re.sub(pattern2, '', content)
print('Removed duplicate buildV3Data')

# Fix 3: Remove duplicate checkCloudForUpdates (keep first one at line 2870)
# Find both occurrences and remove the second one
matches = list(re.finditer(r'async function checkCloudForUpdates\(localData\) \{', content))
if len(matches) >= 2:
    # Get the end of the second occurrence
    start_pos = matches[1].start()
    # Find the matching closing brace
    brace_count = 0
    pos = start_pos
    while pos < len(content) and brace_count >= 0:
        if content[pos] == '{':
            brace_count += 1
        elif content[pos] == '}':
            brace_count -= 1
        pos += 1
    # Remove the duplicate
    content = content[:start_pos] + content[pos:]
    print('Removed duplicate checkCloudForUpdates')

# Fix 4: Fix the double "function function" typo at line 3103
content = content.replace('function function extractModuleFromBlock', 'function extractModuleFromBlock')
print('Fixed double function typo')

# Fix 5: Ensure async is present on key functions
key_functions = ['loadFromCloud', 'switchImportDate']
for func in key_functions:
    if 'async function ' + func not in content:
        # Add async if missing
        content = content.replace(
            'function ' + func + '(',
            'async function ' + func + '('
        )
        print('Added async to ' + func)

# Verify
open_b = content.count('{')
close_b = content.count('}')
diff = open_b - close_b
print('\n=== VERIFICATION ===')
print('Brace balance:', open_b, 'open,', close_b, 'close,', 'diff', diff)
print('Literal backslash-n:', content.count('\\n'))

# Check functions exist
funcs = ['switchTab', 'updateVersion', 'loadFromCloud', 'switchImportDate', 'checkCloudForUpdates', 'buildV3Data', 'parseRecord']
for func in funcs:
    count = len(re.findall(r'function\s+' + func + r'\s*\(', content))
    status = 'OK (' + str(count) + ')' if count >= 1 else 'MISSING!'
    print(func + ': ' + status)

# Write
output_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html.FINAL_CLEAN'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('\nWritten to: index-new.html.FINAL_CLEAN')
print('Final size:', len(content))