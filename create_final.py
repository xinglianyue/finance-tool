#!/usr/bin/env python3
# Create final clean version from git version + fixes

import re

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html.git', 'r', encoding='utf-8') as f:
    content = f.read()

print('Base size:', len(content))

# Fix: Add async to switchImportDate if not present
if 'async function switchImportDate' not in content:
    content = content.replace(
        'function switchImportDate(',
        'async function switchImportDate('
    )
    print('Added async to switchImportDate')

# Fix: Ensure no duplicate checkCloudForUpdates
matches = list(re.finditer(r'async function checkCloudForUpdates', content))
if len(matches) > 1:
    # Remove all but the first
    positions = [m.start() for m in matches]
    # Keep only the first, remove the rest
    for pos in reversed(positions[1:]):
        # Find end of this function
        brace_count = 0
        start = pos
        while start < len(content) and content[start] != '{':
            start += 1
        brace_start = start
        brace = 0
        end = start
        while end < len(content) and brace >= 0:
            if content[end] == '{': brace += 1
            elif content[end] == '}': brace -= 1
            end += 1
        content = content[:pos] + content[end:]
    print('Removed duplicate checkCloudForUpdates')

# Fix: Ensure no duplicate buildV3Data or parseRecord at end
# These appear after main </script>, so remove them
script_end = content.rfind('</script>')
if script_end > 0:
    after_script = content[script_end:]
    if 'function parseRecord' in after_script or 'function buildV3Data' in after_script:
        # Remove everything after </script> that contains these functions
        content = content[:script_end] + after_script.split('</script>')[0] + '</script>'
        print('Cleaned up trailing functions')

# Verify
open_b = content.count('{')
close_b = content.count('}')
diff = open_b - close_b
print(f'\nFinal brace balance: {open_b} open, {close_b} close, diff {diff}')

# Write
output_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html.FINAL_OK'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nWritten to: {output_path}')
print('Final size:', len(content))

# Final check
for func in ['switchTab', 'updateVersion', 'loadFromCloud', 'switchImportDate', 'checkCloudForUpdates', 'buildV3Data', 'parseRecord']:
    count = len(re.findall(r'function\s+' + func + r'\s*\(', content))
    status = 'OK (' + str(count) + ')' if count >= 1 else 'MISSING!'
    print(func + ': ' + status)