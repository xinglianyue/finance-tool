#!/usr/bin/env python3
# Apply final async fixes and ensure clean file

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

print('Current size:', len(content))

# Check and fix async declarations
fixes_applied = []

if 'async function switchImportDate' not in content:
    content = content.replace(
        'function switchImportDate(',
        'async function switchImportDate(',
        1  # Only replace first occurrence
    )
    fixes_applied.append('Added async to switchImportDate')

if 'async function checkCloudForUpdates' not in content:
    content = content.replace(
        'function checkCloudForUpdates(',
        'async function checkCloudForUpdates(',
        1
    )
    fixes_applied.append('Added async to checkCloudForUpdates')

# Verify brace balance
open_b = content.count('{')
close_b = content.count('}')
diff = open_b - close_b
print(f'Brace balance: {open_b} open, {close_b} close, diff {diff}')

# Write updated file
with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('\nApplied fixes:')
for fix in fixes_applied:
    print('  -', fix)

if not fixes_applied:
    print('  No fixes needed - all async declarations present')

print('\nFinal size:', len(content))
print('File ready for git commit.')