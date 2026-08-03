#!/usr/bin/env python3
# Verify and deploy the fixed file

import re

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.git.version', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'File size: {len(content)}')
print(f'Brace diff: {content.count(chr(123)) - content.count(chr(125))}')

# The literal backslash-n is inside a string, which is correct JavaScript
# Check if it's in a string context
literal_n_pos = content.find('\\n')
if literal_n_pos > 0:
    # Check surrounding context
    start = max(0, literal_n_pos - 20)
    end = min(len(content), literal_n_pos + 20)
    context = content[start:end]
    print(f'\nLiteral \\n at position {literal_n_pos}:')
    print(f'  Context: {repr(context)}')
    
    # Check if it's inside quotes (a string)
    before = content[:literal_n_pos]
    single_quotes = before.count("'") - before.count("\\'")
    double_quotes = before.count('"') - before.count('\\"')
    
    if single_quotes % 2 == 1 or double_quotes % 2 == 1:
        print('  This is INSIDE a string - CORRECT!')
    else:
        print('  This is OUTSIDE a string - PROBLEM!')

# Check all required functions exist with proper async declarations
print('\n=== FUNCTION CHECKS ===')
funcs_checks = [
    ('switchTab', False),
    ('updateVersion', False),
    ('loadFromCloud', True),
    ('switchImportDate', True),
    ('checkCloudForUpdates', True),
    ('buildV3Data', False),
    ('parseRecord', False),
]

for func, needs_async in funcs_checks:
    has_func = f'function {func}(' in content or f'async function {func}(' in content
    has_async = f'async function {func}(' in content
    
    status = 'OK'
    if not has_func:
        status = 'MISSING!'
    elif needs_async and not has_async:
        status = 'NEEDS ASYNC!'
    
    print(f'{func}: {status}')

# Copy to index-new.html
output_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nCopied to: {output_path}')
print('Ready for git commit and push.')