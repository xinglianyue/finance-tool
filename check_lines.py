with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
print('Total lines:', len(lines))

if len(lines) >= 1651:
    print('\nLine 1651:', repr(lines[1650]))

if len(lines) >= 1286:
    print('\nLine 1285:', repr(lines[1284]))
    print('Line 1286:', repr(lines[1285]))

print('\n--- Checks ---')
print('switchTab exists:', 'function switchTab' in content)
print('Brace diff:', content.count('{') - content.count('}'))
print('Literal backslash-n count:', content.count('\\n'))

# Show context around line 1651
if len(lines) >= 1651:
    start = max(0, 1645)
    end = min(len(lines), 1660)
    print('\nContext around line 1651:')
    for i in range(start, end):
        marker = ' >>>' if i == 1650 else '   '
        print(f'{i+1:4d}: {repr(lines[i][:80])}{marker}')