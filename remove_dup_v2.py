#!/usr/bin/env python3
# Remove duplicate function definitions

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

print('Original size:', len(content))

import re

# Functions to deduplicate
dedup_functions = ['switchImportDate', 'checkCloudForUpdates', 'parseRecord', 'buildV3Data']

for func_name in dedup_functions:
    pattern = r'(function\s+' + re.escape(func_name) + r'\s*[^{]*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})'
    matches = list(re.finditer(pattern, content, re.DOTALL))
    
    if len(matches) > 1:
        print(func_name + ': Found ' + str(len(matches)) + ' definitions, keeping last one')
        
        first_start = matches[0].start()
        last_end = matches[-1].end()
        last_def = matches[-1].group(0)
        
        new_content = content[:first_start] + last_def + content[last_end:]
        content = new_content
        
        print('  Removed ' + str(len(matches) - 1) + ' duplicate(s)')

# Fix literal backslash-n
literal_count = content.count('\\n')
if literal_count > 0:
    print('Removing ' + str(literal_count) + ' literal backslash-n sequences')
    content = content.replace('\\n', '\n')

# Verify
open_b = content.count('{')
close_b = content.count('}')
diff = open_b - close_b
print('\nBrace balance: ' + str(open_b) + ' open, ' + str(close_b) + ' close, diff ' + str(diff))

# Write
output_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html.FINAL_CLEAN'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('\nWritten to: ' + output_path)
print('Final size: ' + str(len(content)) + ' chars')

# Verify
print('\n=== FINAL VERIFICATION ===')
print('Literal backslash-n count:', content.count('\\n'))
print('Brace diff:', content.count('{') - content.count('}'))

funcs_to_check = ['switchTab', 'updateVersion', 'loadFromCloud', 'switchImportDate', 'checkCloudForUpdates', 'buildV3Data', 'parseRecord']
for func in funcs_to_check:
    count = len(re.findall(r'function\s+' + func + r'\s*\(', content))
    status = 'OK (' + str(count) + ')' if count >= 1 else 'MISSING!'
    print(func + ': ' + status)