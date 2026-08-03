with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.git.version', 'r', encoding='utf-8') as f:
    content = f.read()

print('File size:', len(content))

import re
matches = list(re.finditer(r'\\n', content))
print(f'Found {len(matches)} literal backslash-n sequences:')

for i, m in enumerate(matches):
    pos = m.start()
    start = max(0, pos - 50)
    end = min(len(content), pos + 50)
    context = content[start:end]
    print(f'\n{i+1}. Position {pos}:')
    print(f'   Context: ...{repr(context)}...')