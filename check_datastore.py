with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 查找DataStore相关的代码
import re

print('=== DataStore相关代码 ===')
matches = list(re.finditer(r'DataStore\.\w+', content))
for m in matches[:20]:
    pos = m.start()
    start = max(0, pos - 50)
    end = min(len(content), pos + 50)
    print(f'Position {pos}: ...{repr(content[start:end])}...')

print('\n=== data-store.js引用 ===')
if 'data-store.js' in content:
    print('找到data-store.js引用')
else:
    print('未找到data-store.js引用')

print('\n=== window.DataStore定义 ===')
if 'window.DataStore' in content:
    idx = content.find('window.DataStore')
    print(f'Position {idx}: {repr(content[idx:idx+100])}')
else:
    print('未找到window.DataStore定义')