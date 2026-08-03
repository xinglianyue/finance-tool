#!/usr/bin/env python3
# Remove duplicate function definitions

import re

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

print('Original size:', len(content))

# Functions to deduplicate (keep last occurrence)
functions_to_dedup = ['parseRecord', 'buildV3Data', 'checkCloudForUpdates']

for func_name in functions_to_dedup:
    # Find all occurrences of this function definition
    pattern = r'function\s+' + re.escape(func_name) + r'\s*\([^)]*\)\s*\{'
    matches = list(re.finditer(pattern, content))
    
    if len(matches) > 1:
        print(f'{func_name}: Found {len(matches)} definitions')
        
        # Keep only the last one, remove previous ones
        # Work backwards to preserve positions
        for i in range(len(matches) - 2, -1, -1):
            start = matches[i].start()
            # Find matching closing brace
            brace_count = 0
            pos = matches[i].end() - 1  # Start from opening brace
            while pos < len(content) and brace_count >= 0:
                if content[pos] == '{':
                    brace_count += 1
                elif content[pos] == '}':
                    brace_count -= 1
                pos += 1
            
            # Remove this function definition
            content = content[:start] + content[pos:]
            print(f'  Removed duplicate at position {start}')

# Verify
open_b = content.count('{')
close_b = content.count('}')
diff = open_b - close_b
print(f'\nFinal brace balance: {open_b} open, {close_b} close, diff {diff}')

# Check for remaining duplicates
for func_name in functions_to_dedup:
    count = len(re.findall(r'function\s+' + re.escape(func_name) + r'\s*\(', content))
    print(f'{func_name}: {count} occurrence(s)')

# Write output
with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html.FINAL_CLEAN', 'w', encoding='utf-8') as f:
    f.write(content)

print('\nWritten to index-new.html.FINAL_CLEAN')
print('Final size:', len(content))