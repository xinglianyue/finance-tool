#!/usr/bin/env python3
# Final deployment version - clean and verified

import re

# Read the working version from git
with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html.git', 'r', encoding='utf-8') as f:
    content = f.read()

print('Loaded working version, size:', len(content))

# Verify no literal backslash-n sequences
literal_count = content.count('\\n')
print('Literal backslash-n count:', literal_count)

# Fix if any found
if literal_count > 0:
    content = content.replace('\\n', '\n')
    print('Replaced literal backslash-n sequences')

# Verify brace balance
open_b = content.count('{')
close_b = content.count('}')
diff = open_b - close_b
print(f'Brace balance: {open_b} open, {close_b} close, diff {diff}')

# Write to index-new.html
output_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('\nWritten to:', output_path)
print('Final size:', len(content))

# Final verification
print('\n=== FINAL VERIFICATION ===')
print('Brace diff:', content.count('{') - content.count('}'))
print('Literal backslash-n:', content.count('\\n'))

funcs = ['switchTab', 'updateVersion', 'loadFromCloud', 'switchImportDate', 'checkCloudForUpdates']
for func in funcs:
    has_func = ('function ' + func + '(' in content) or ('async function ' + func + '(' in content)
    print(func + ': ' + ('OK' if has_func else 'MISSING!'))

# Check for duplicate definitions
for func in ['parseRecord', 'buildV3Data', 'checkCloudForUpdates']:
    count = len(re.findall(r'function\s+' + func + r'\s*\(', content))
    status = 'OK (' + str(count) + ')' if count == 1 else 'DUPLICATE (' + str(count) + ')'
    print(func + ': ' + status)