# -*- coding: utf-8 -*-
"""Fix the cloudData.forEach loop to skip history_meta records"""
import re

file_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the problematic code block
old_code = '''cloudData.forEach(record => {



          cache[record.date] = parseRecord(record);



        });'''

new_code = '''cloudData.forEach(record => {
          if (record.type === 'history_meta' || !record.merchantData) return;
          try {
            cache[record.date] = parseRecord(record);
          } catch (e) {
            console.warn('[App] failed to parse record:', record.date, e);
          }
        });'''

if old_code in content:
    content = content.replace(old_code, new_code)
    print("Found and replaced!")
elif 'cloudData.forEach(record => {' in content:
    # Try regex approach
    pattern = r'(cloudData\.forEach\(record => \{)[\s\S]*?(cache\[record\.date\] = parseRecord\(record\);)[\s\S]*?(\});'
    replacement = r'\1\n          if (record.type === \'history_meta\' || !record.merchantData) return;\n          try {\n            cache[record.date] = parseRecord(record);\n          } catch (e) {\n            console.warn(\'[App] failed to parse record:\', record.date, e);\n          }\n        \3'
        content = re.sub(pattern, replacement, content)
        print("Replaced via regex!")
else:
    print("Pattern not found!")
    # Show what's around line 11588
    lines = content.split('\n')
    for i in range(11580, min(11600, len(lines))):
        print(f"{i+1}: {lines[i]}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved.")
