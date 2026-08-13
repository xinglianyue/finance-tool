# -*- coding: utf-8 -*-
import re

file_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 修复 initialize 方法格式错误
# 原来的代码：
# get(key) {
#   return window[key];
# }
#
# initialize(initialData) {
#
# 应该改成：
# get(key) {
#   return window[key];
# }
#
# initialize(initialData) {

old_pattern = """        get(key) {
          return window[key];
        }

initialize(initialData) {"""

new_pattern = """        get(key) {
          return window[key];
        }
        
        initialize(initialData) {"""

if old_pattern in content:
    content = content.replace(old_pattern, new_pattern)
    print("Fixed: Added proper indentation for initialize method")
else:
    print("Pattern not found, trying alternative...")
    # Try to find and fix it
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'initialize(initialData)' in line and i > 200 and i < 250:
            print(f"Found initialize at line {i+1}")
            # Check if previous line ends with }
            if lines[i-1].strip() == '}':
                # Need to add empty line and proper indentation
                lines.insert(i, '')
                lines[i] = '        initialize(initialData) {'
                content = '\n'.join(lines)
                print("Fixed by adding indentation")
                break

# Save the fixed content
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved!")
