# -*- coding: utf-8 -*-
"""彻底修复编码问题 - 从原始备份恢复"""
import os
import time
import re

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

# 先检查当前文件状态
with open(path, "rb") as f:
    raw = f.read()

content = raw.decode('utf-8', errors='replace')

print(f"File size: {len(content)} chars")
print(f"BOM present: {raw[:3] == b'\xef\xbb\xbf'}")

# 查找所有乱码位置
garbled_patterns = [
    ('专?', '专用'),
    ('检?', '检测'),
    ('鏀?, '数据'),
    ('鏈?, '版本'),
    ('娣?', '更新'),
    ('纭?', '确保'),
]

found_issues = False
for bad, good in garbled_patterns:
    count = content.count(bad)
    if count > 0:
        print(f"Found {count} instances of '{bad}'")
        found_issues = True

if not found_issues:
    # 检查中文是否正常
    if '美团' in content and '财务' in content:
        print("Chinese text appears normal")
    else:
        print("WARNING: Chinese text missing or corrupted")
        
# 查看标题行
lines = content.split('\n')
for i, line in enumerate(lines[:15], start=1):
    if '<title>' in line.lower():
        print(f"Line {i}: {line}")
        
print("\nCurrent APP_VERSION:")
for line in lines:
    if 'APP_VERSION' in line:
        print(f"  {line.strip()}")
