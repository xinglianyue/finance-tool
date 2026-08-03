with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')

# Check line 2611 (regex error)
if len(lines) >= 2611:
    print(f'\nLine 2611: {repr(lines[2610][:120])}')

# Check lines around 1285 for switchTab
if len(lines) >= 1290:
    print('\nLines around 1285:')
    for i in range(1280, min(len(lines), 1295)):
        marker = ' >>>' if i+1 in [1285, 1286] else '   '
        print(f'{i+1:4d}: {repr(lines[i][:80])}{marker}')

# Check if switchTab function exists
content = ''.join(lines)
switch_tab_count = content.count('function switchTab')
print(f'\nswitchTab occurrences: {switch_tab_count}')

# Check for regex patterns near line 2611
print('\nContext around line 2611:')
for i in range(max(0, 2605), min(len(lines), 2620)):
    print(f'{i+1:4d}: {repr(lines[i][:100])}')