#!/usr/bin/env python3
# Make a visible change to force GitHub Pages to re-deploy

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'Original size: {len(content)}')

# Add a version comment to make the file different
version_comment = '\n<!-- Version 20260731.8 - FINAL FIX -->\n'
if version_comment.strip() not in content:
    # Insert after <!DOCTYPE html>
    content = content.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<!-- Version 20260731.8 - FINAL FIX -->', 1)
    print('Added version comment')
    
    # Write back
    with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f'New size: {len(content)}')
else:
    print('Version comment already exists')

# Verify
print(f'\nFinal checks:')
print(f'  Brace diff: {content.count(chr(123)) - content.count(chr(125))}')
print(f'  Contains version: {"20260731.8" in content}')