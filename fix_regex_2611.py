with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'Original size: {len(content)}')

# Fix the broken regex pattern at lines 2611-2612
# The pattern is: .replace(/\\n\n/g, '') which should be .replace(/\\n/g, '')
broken_pattern = '.replace(/\\n\n/g'
correct_pattern = '.replace(/\\n/g'

if broken_pattern in content:
    print(f'Found broken regex pattern')
    content = content.replace(broken_pattern, correct_pattern)
    print(f'Fixed! Replaced with correct pattern')
else:
    print('Pattern not found, trying alternative...')
    # Try a more flexible search
    import re
    matches = list(re.finditer(r'\.replace\(/\\n\s*\n/g', content))
    if matches:
        print(f'Found {len(matches)} broken regex using regex search')
        for m in matches:
            content = content[:m.start()] + '.replace(/\\n/g' + content[m.end():]
            print(f'  Fixed at position {m.start()}')
    else:
        print('No broken regex found')

# Verify fix
open_b = content.count('{')
close_b = content.count('}')
print(f'\nAfter fix:')
print(f'  Size: {len(content)}')
print(f'  Brace diff: {open_b - close_b}')

# Check for remaining issues
remaining = content.count('.replace(/\\n\n/g')
print(f'  Remaining broken regex: {remaining}')

# Write fixed version
with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('\nFile saved.')