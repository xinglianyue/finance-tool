with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'Original size: {len(content)} chars')

# 检查是否已有data-store.js引用
if 'js/data-store.js' in content:
    print('已存在data-store.js引用，但可能位置不对')
else:
    print('未找到data-store.js引用，需要添加')

# 查找第一个script标签的位置
script_pattern = r'<script\s'
matches = list(__import__('re').finditer(script_pattern, content))
print(f'\n找到{len(matches)}个script标签')

if matches:
    # 在第一个script之前插入data-store.js
    first_script_pos = matches[0].start()
    
    # 创建正确的script标签（放在最前面）
    datastore_script = '<script src="js/data-store.js?v=20260731.12"></script>\n'
    state_script = '<script src="js/state-manager.js?v=20260731.12"></script>\n'
    
    # 在第一个script前插入
    new_content = content[:first_script_pos] + datastore_script + state_script + content[first_script_pos:]
    
    print('\n✓ 已在第一个script前插入data-store.js和state-manager.js')
    
    # 验证
    if 'js/data-store.js' in new_content:
        print('✓ data-store.js 引用已添加')
    else:
        print('✗ data-store.js 引用未找到')
    
    # 写回文件
    with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f'\nFinal size: {len(new_content)} chars')
else:
    print('未找到任何script标签')