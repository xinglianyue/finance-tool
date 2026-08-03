#!/usr/bin/env python3
# Check the ACTUAL committed version for issues

import subprocess
import sys

# Get the committed version
result = subprocess.run(
    ['git', 'show', 'HEAD:index-new.html'],
    capture_output=True
)

if result.returncode != 0:
    print('Error:', result.stderr.decode('utf-8', errors='replace'))
    sys.exit(1)

content = result.stdout.decode('utf-8', errors='replace')
print(f'Committed file size: {len(content)} chars')
print(f'Brace diff: {content.count(chr(123)) - content.count(chr(125))}')

# Check line 2611 (regex error location)
lines = content.split('\n')
if len(lines) >= 2611:
    print(f'\nLine 2611: {repr(lines[2610][:100])}')
    
# Check for the broken regex pattern  
if '.replace(/\\n' in content:
    import re
    matches = list(re.finditer(r'\.replace\(/\\n', content))
    print(f'\nFound {len(matches)} instances of .replace(/\\n')
    for m in matches[:5]:
        pos = m.start()
        # Show context
        start = max(0, pos - 20)
        end = min(len(content), pos + 40)
        print(f'  At {pos}: {repr(content[start:end])}')

# Check switchTab function
if 'function switchTab' in content:
    import re
    matches = list(re.finditer(r'function switchTab\s*\(', content))
    print(f'\nswitchTab function found {len(matches)} time(s)')
else:
    print('\nERROR: switchTab function NOT FOUND!')

# Write a simple test to verify syntax
print('\n=== Syntax Check ===')
try:
    compile(content, 'index-new.html', 'exec')
    print('JavaScript syntax: OK (Python parsed without errors)')
except SyntaxError as e:
    print(f'JavaScript syntax error: {e}')