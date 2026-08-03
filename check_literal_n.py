with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.git.version', 'r', encoding='utf-8') as f:
    c = f.read()

print('Size:', len(c))
print('Brace diff:', c.count('{') - c.count('}'))
print('Literal backslash-n:', c.count('\\n'))

import re
matches = list(re.finditer(r'\\n', c))
print(f'\nFound {len(matches)} literal \\n sequences:')

for i, m in enumerate(matches):
    pos = m.start()
    start = max(0, pos - 40)
    end = min(len(c), pos + 40)
    print(f'{i+1}. Position {pos}: ...{repr(c[start:end])}...')