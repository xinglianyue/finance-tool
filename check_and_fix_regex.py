#!/usr/bin/env python3
# Check and fix the broken regex at line 2611

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')

# Check line 2611 context
print('\n=== Lines around 2611 ===')
for i in range(max(0, 2608), min(len(lines), 2615)):
    marker = ' >>>' if i == 2610 else '   '
    print(f'{i+1}: {repr(lines[i][:100])}{marker}')

# Find the broken pattern
broken_found = False
for i, line in enumerate(lines):
    if '.replace(/\\n' in line and not line.rstrip().endswith('/g'):
        print(f'\nFound broken regex at line {i+1}')
        print(f'  Current: {repr(line.rstrip())}')
        # Check next line
        if i + 1 < len(lines):
            next_line = lines[i + 1].lstrip()
            print(f'  Next: {repr(next_line[:50])}')
            if next_line.startswith('/g'):
                print('  This is a broken regex - need to merge lines')
                broken_found = True

if broken_found:
    # Fix: Merge the broken lines
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check for broken regex pattern
        if '.replace(/\\n' in line and not line.rstrip().endswith('/g'):
            if i + 1 < len(lines):
                next_line = lines[i + 1].lstrip()
                if next_line.startswith('/g'):
                    # Merge and fix
                    merged = line.rstrip() + '\\n' + next_line
                    print(f'\nFixed line {i+1}: {repr(merged[:80])}')
                    new_lines.append(merged + '\n')
                    i += 2
                    continue
        
        new_lines.append(line)
        i += 1
    
    # Write fixed content
    with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print(f'\nFixed! New line count: {len(new_lines)}')
else:
    print('\nNo broken regex found - checking for other issues...')

# Verify brace balance
content = ''.join(lines) if not broken_found else ''.join(new_lines)
open_b = content.count('{')
close_b = content.count('}')
print(f'\nBrace balance: {open_b} open, {close_b} close, diff {open_b - close_b}')