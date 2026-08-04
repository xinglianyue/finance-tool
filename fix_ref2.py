with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

print('Original size:', len(content))

# 检查是否有正确的script引用
if '<script src="js/data-store.js' in content:
    print('Found data-store.js reference')
else:
    print('NOT found data-store.js reference, adding...')

# 查找第一个<script标签
import re
first_script = re.search(r'<script[^>]*>', content)
if first_script:
    pos = first_script.start()
    # 在前面添加data-store.js和state-manager.js
    prepend = '<script src="js/data-store.js?v=20260731.12"></script>\n  <script src="js/state-manager.js?v=20260731.12"></script>\n  '
    new_content = content[:pos] + prepend + content[pos:]
    
    # 写回
    with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print('Added script references at position', pos)
    print('New size:', len(new_content))
else:
    print('No script tags found')