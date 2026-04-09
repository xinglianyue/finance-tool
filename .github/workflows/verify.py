# -*- coding: utf-8 -*-
with open(r'C:\Users\surface\WorkBuddy\Claw\finance-tool-v6\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

print("=" * 50)
print("v6 代码验证")
print("=" * 50)

print("\n文件大小: %d chars" % len(html))

# 括号匹配
script_start = html.find('<script>')
script_end = html.find('</script>', script_start)
js = html[script_start+8:script_end]

brackets = {'(': 0, ')': 0, '{': 0, '}': 0}
for ch in js:
    if ch in brackets:
        brackets[ch] += 1

print("\n括号检查:")
print("  (): %d / %d %s" % (brackets['('], brackets[')'], 'OK' if brackets['(']==brackets[')'] else 'MISMATCH'))
print("  {: %d / %d %s" % (brackets['{'], brackets['}'], 'OK' if brackets['{']==brackets['}'] else 'MISMATCH'))

# 关键函数检查
checks = [
    ('CONFIG定义', 'const CONFIG'),
    ('Utils定义', 'const Utils'),
    ('CityEntity定义', 'const CityEntity'),
    ('FileUploadFeature定义', 'const FileUploadFeature'),
    ('SummaryCardsWidget定义', 'const SummaryCardsWidget'),
    ('CityTableWidget定义', 'const CityTableWidget'),
    ('App定义', 'const App'),
    ('App.init调用', 'App.init()'),
    ('DOMContentLoaded', 'DOMContentLoaded'),
    ('XLSX.read', 'XLSX.read'),
    ('City构造函数', 'function City(data)'),
    ('parseCitiesFromSheet', 'parseCitiesFromSheet'),
    ('showToast', 'showToast'),
    ('validateFile', 'validateFile'),
]

print("\n关键代码检查:")
for name, pattern in checks:
    found = pattern in html
    status = 'OK' if found else 'MISSING'
    print("  %s: [%s]" % (name, status))

# 错误处理
print("\n错误处理检查:")
for pattern, desc in [
    ('try {', 'try-catch'),
    ("'E002'", '错误码E002'),
    ("'E003'", '错误码E003'),
    ("'E004'", '错误码E004'),
    ('Utils.showToast', 'showToast调用'),
]:
    found = pattern in html
    print("  %s: %s" % (desc, 'OK' if found else 'MISSING'))

# 输入验证
print("\n输入验证检查:")
for pattern, desc in [
    ("throw new Error('E001", 'City输入验证'),
    ('function validateFile', 'validateFile函数'),
    ('if (!file)', '空值检查'),
]:
    found = pattern in html
    print("  %s: %s" % (desc, 'OK' if found else 'MISSING'))

# CSS
print("\nCSS检查:")
for pattern, desc in [
    (':root {', 'CSS变量'),
    ('@media', '响应式'),
    ('.empty-state', '空状态样式'),
    ('#toast', 'Toast样式'),
    ('.cards-grid', '卡片网格'),
    ('.city-table', '城市表格'),
]:
    found = pattern in html
    print("  %s: %s" % (desc, 'OK' if found else 'MISSING'))

# HTML结构
print("\nHTML结构检查:")
for pattern, desc in [
    ('id="fileInput"', 'fileInput'),
    ('id="uploadArea"', 'uploadArea'),
    ('id="dynamicContent"', 'dynamicContent'),
    ('id="toast"', 'toast元素'),
]:
    found = pattern in html
    print("  %s: %s" % (desc, 'OK' if found else 'MISSING'))

print("\n" + "=" * 50)
print("验证完成")
print("=" * 50)
