# -*- coding: utf-8 -*-
"""v6 代码验证"""
import re

with open(r'C:\Users\surface\WorkBuddy\Claw\finance-tool-v6\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

print("=" * 50)
print("v6 代码验证")
print("=" * 50)

# 1. 基本信息
print(f"\n文件大小: {len(html)} chars")

# 2. 括号匹配
script_start = html.find('<script>')
script_end   = html.find('</script>', script_start)
js = html[script_start+8:script_end]

brackets = {'(': 0, ')': 0, '{': 0, '}': 0}
for ch in js:
    if ch in brackets:
        brackets[ch] += 1

print(f"\n括号检查:")
print(f"  (): {brackets['(']} / {brackets[')']} {'OK' if brackets['(']==brackets[')'] else 'MISMATCH'}")
print(f"" "{{: {brackets['{']} / {brackets['}']} {'OK' if brackets['{']==brackets['}'] else 'MISMATCH'}" """)

# 3. 关键函数检查
checks = [
    ('CONFIG定义', 'const CONFIG = (function'),
    ('Utils定义', 'const Utils = (function'),
    ('CityEntity定义', 'const CityEntity = (function'),
    ('FileUploadFeature定义', 'const FileUploadFeature = (function'),
    ('SummaryCardsWidget定义', 'const SummaryCardsWidget = (function'),
    ('CityTableWidget定义', 'const CityTableWidget = (function'),
    ('App定义', 'const App = (function'),
    ('App.init调用', 'App.init()'),
    ('DOMContentLoaded', "document.addEventListener('DOMContentLoaded'"),
    ('XLSX引用', 'XLSX.read'),
    ('City构造函数', 'function City(data)'),
    ('parseCitiesFromSheet', 'function parseCitiesFromSheet'),
    ('renderEmpty', 'function renderEmpty'),
    ('showToast', 'function showToast'),
    ('validateFile', 'function validateFile'),
]

print("\n关键代码检查:")
for name, pattern in checks:
    found = pattern in html
    status = 'OK' if found else 'MISSING'
    print(f"  {name}: [{status}]")

# 4. 模块结构检查
print("\n模块结构检查:")
modules = ['CONFIG', 'Utils', 'CityEntity', 'FileUploadFeature',
            'SummaryCardsWidget', 'CityTableWidget', 'App']
for mod in modules:
    if mod in html:
        print(f"  {mod}: OK")
    else:
        print(f"  {mod}: MISSING")

# 5. 错误处理检查
print("\n错误处理检查:")
error_checks = [
    ('try-catch', 'try {'),
    ('错误码E002', 'E002'),
    ('错误码E003', 'E003'),
    ('错误码E004', 'E004'),
    ('showToast调用', 'Utils.showToast'),
]
for name, pattern in error_checks:
    found = pattern in html
    print(f"  {name}: {'OK' if found else 'MISSING'}")

# 6. 输入验证检查
print("\n输入验证检查:")
valid_checks = [
    ('City构造函数验证', "throw new Error('E001"),
    ('validateFile', 'function validateFile'),
    ('null检查', 'if (!file)'),
]
for name, pattern in valid_checks:
    found = pattern in html
    print(f"  {name}: {'OK' if found else 'MISSING'}")

# 7. CSS检查
print("\nCSS检查:")
css_checks = [
    ('CSS变量定义', ':root {'),
    ('响应式媒体查询', '@media'),
    ('空状态样式', '.empty-state'),
    ('Toast样式', '#toast'),
    ('卡片网格', '.cards-grid'),
    ('城市表格', '.city-table'),
]
for name, pattern in css_checks:
    found = pattern in html
    print(f"  {name}: {'OK' if found else 'MISSING'}")

# 8. HTML结构检查
print("\nHTML结构检查:")
html_checks = [
    ('fileInput', 'id="fileInput"'),
    ('uploadArea', 'id="uploadArea"'),
    ('dynamicContent', 'id="dynamicContent"'),
    ('toast元素', 'id="toast"'),
]
for name, pattern in html_checks:
    found = pattern in html
    print(f"  {name}: {'OK' if found else 'MISSING'}")

print("\n" + "=" * 50)
print("验证完成")
print("=" * 50)
