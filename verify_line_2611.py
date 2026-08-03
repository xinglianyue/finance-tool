with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')

# Show lines around 2611
print('\n=== Lines 2608-2615 ===')
for i in range(2607, min(len(lines), 2615)):
    marker = ' >>>' if i == 2610 else '   '
    line = lines[i].rstrip()
    print(f'{i+1:4d}: {repr(line[:100])}{marker}')

# Check for the pattern
content = ''.join(lines)
if '.replace(/\\n\n/g' in content:
    print('\nFOUND broken regex pattern!')
else:
    print('\nNo broken regex pattern found')

# Also check line by line
for i, line in enumerate(lines[2605:2620], start=2606):
    if '\\n' in line and 'replace' in line:
        print(f'\nLine {i} contains \\n: {repr(line[:80])}')