with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')

# Check around line 2930
print('\n=== Lines around 2930 ===')
for i in range(max(0, 2925), min(len(lines), 2940)):
    marker = ' >>>' if i == 2929 else '   '
    line = lines[i].rstrip()
    print(f'{i+1}: {repr(line[:120])}{marker}')

# Also search for all .replace(/ patterns that might be broken
print('\n=== Searching for potential broken regex patterns ===')
import re
for i, line in enumerate(lines):
    if '.replace(/' in line and not line.rstrip().endswith('/g'):
        # Check if next line starts with /g or similar
        if i + 1 < len(lines):
            next_line = lines[i + 1].lstrip()
            if next_line.startswith('/g') or next_line.startswith('/i') or next_line.startswith('/m'):
                print(f'\nLine {i+1}-{i+2}: Potential broken regex')
                print(f'  Line {i+1}: {repr(line.rstrip()[:80])}')
                print(f'  Line {i+2}: {repr(next_line[:80])}')