import time

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add timestamp to force cache refresh
timestamp = str(int(time.time()))
old_comment = '<!-- Version: 20260731.5-FINAL-FIX -->'
new_comment = '<!-- Version: 20260731.' + timestamp + ' -->'

if old_comment in content:
    content = content.replace(old_comment, new_comment)
    print('Updated version comment with timestamp:', timestamp)
else:
    # Insert version comment if not present
    if '<script>' in content:
        content = content.replace('<script>', '<script>\n<!-- Version: 20260731.' + timestamp + ' -->', 1)
        print('Added new version comment with timestamp:', timestamp)

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('File updated successfully')
print('New size:', len(content))