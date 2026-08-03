with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')

# Show lines around 1651 (the error location)
print('Context around line 1651:\n')
for i in range(max(0, 1645), min(len(lines), 1660)):
    marker = ' >>>' if i == 1650 else '   '
    line = lines[i]
    # Show first 100 chars
    print(f'{i+1:4d}: {repr(line[:100])}{marker}')

print('\n--- Checking for string issues ---')
# Check if there are unclosed strings
in_string = False
string_char = None
line_num = 0
for i, ch in enumerate(content):
    if ch == '\n':
        line_num += 1
    elif not in_string and ch in '"\'`':
        in_string = True
        string_char = ch
    elif in_string and ch == string_char:
        in_string = False
        string_char = None

print('String parsing completed')