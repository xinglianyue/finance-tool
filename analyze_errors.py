with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')

# Check line 2611 (regex error)
print('\n=== Line 2611 context ===')
for i in range(max(0, 2608), min(len(lines), 2615)):
    marker = ' >>>' if i == 2610 else '   '
    print(f'{i+1}: {repr(lines[i][:100])}{marker}')

# Check line 1285 area for switchTab definition
print('\n=== Lines around 1285 (switchTab call) ===')
for i in range(max(0, 1280), min(len(lines), 1290)):
    marker = ' >>>' if i in [1284, 1285] else '   '
    line = lines[i].strip()
    if line:
        print(f'{i+1}: {repr(line[:100])}{marker}')

# Find switchTab function definition
print('\n=== Finding switchTab definition ===')
for i, line in enumerate(lines):
    if 'function switchTab' in line:
        print(f'Found at line {i+1}: {repr(line[:100])}')
        # Show context
        for j in range(max(0, i-2), min(len(lines), i+5)):
            print(f'  {j+1}: {repr(lines[j][:80])}')
        break