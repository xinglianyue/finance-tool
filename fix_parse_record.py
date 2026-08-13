# -*- coding: utf-8 -*-
"""Fix parseRecord to handle history_meta records gracefully"""
import re

file_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_pattern = r'''cloudData\.forEach\(record => \{\n\n\n          cache\[record\.date\] = parseRecord\(record\);\n\n\n        \}\);'''

new_code = '''cloudData.forEach(record => {
          if (record.type === 'history_meta' || !record.merchantData) return;
          try {
            cache[record.date] = parseRecord(record);
          } catch (e) {
            console.warn('[App] failed to parse record:', record.date, e);
          }
        });'''

if old_pattern in content:
    content = content.replace(old_pattern, new_code)
    print("Found and replaced pattern")
else:
    # Try regex
    match = re.search(r'cloudData\.forEach\(record => \{[^}]*cache\[record\.date\] = parseRecord\(record\);[^}]*\}\);', content, re.DOTALL)
    if match:
        content = content[:match.start()] + new_code + content[match.end():]
        print("Found and replaced via regex")
    else:
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'cloudData.forEach' in line:
                print(f"Found at line {i+1}")
                for j in range(max(0, i), min(len(lines), i+10)):
                    print(f"  {j+1}: {lines[j]}")
                break

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved.")
