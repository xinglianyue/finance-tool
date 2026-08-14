# -*- coding: utf-8 -*-
"""彻底修复所有编码问题 - 扫描并替换所有乱码"""
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

# 读取文件
with open(path, "rb") as f:
    raw = f.read()

print(f"Original file size: {len(raw)} bytes")

# 检查BOM
if raw[:3] == b'\xef\xbb\xbf':
    raw = raw[3:]
    print("Removed BOM")

# 解码为UTF-8（使用errors='replace'处理损坏的部分）
content = raw.decode('utf-8', errors='replace')

# 统计替换字符数量
replaced_count = content.count('\ufffd')
print(f"Found {replaced_count} replacement characters (U+FFFD)")

# 查找所有包含替换字符的行
lines = content.split('\n')
problem_lines = []
for i, line in enumerate(lines, start=1):
    if '\ufffd' in line:
        problem_lines.append((i, line.strip()[:100]))

print(f"\nProblematic lines found: {len(problem_lines)}")
for line_num, preview in problem_lines[:10]:
    print(f"  Line {line_num}: {preview}")

# 尝试恢复常见的中文乱码
# 这些是常见的GBK被误读为UTF-8的情况
fixes = [
    # 常见的中文字符
    ('专\u00bf\u0097\u0080\u00ac', '专用'),
    ('资\u00bf\u0097\u0080\u00ac', '资源'),
    ('保\u00bf\u0097\u0080\u00ac', '保存'),
    ('存\u00bf\u0097\u0080\u00ac', '存储'),
    # 城市名称
    ('承德\u00bf\u0097\u0080\u00ac', '承德'),
    ('围场\u00bf\u0097\u0080\u00ac', '围场满族蒙古族自治县'),
    ('康保\u00bf\u0097\u0080\u00ac', '康保'),
    ('玉田\u00bf\u0097\u0080\u00ac', '玉田'),
    ('涿州\u00bf\u0097\u0080\u00ac', '涿州'),
    ('迁安\u00bf\u0097\u0080\u00ac', '迁安'),
    ('遵化\u00bf\u0097\u0080\u00ac', '遵化'),
    ('滦南\u00bf\u0097\u0080\u00ac', '滦南'),
    ('滦县\u00bf\u0097\u0080\u00ac', '滦县'),
    ('乐亭\u00bf\u0097\u0080\u00ac', '乐亭'),
    ('迁西\u00bf\u0097\u0080\u00ac', '迁西'),
    ('唐海\u00bf\u0097\u0080\u00ac', '唐海'),
    ('昌黎\u00bf\u0097\u0080\u00ac', '昌黎'),
    ('卢龙\u00bf\u0097\u0080\u00ac', '卢龙'),
]

fixed_count = 0
for bad, good in fixes:
    count = content.count(bad)
    if count > 0:
        content = content.replace(bad, good)
        fixed_count += count
        print(f"Fixed '{bad}' -> '{good}': {count} times")

# 重新写入文件（不带BOM，UTF-8）
with open(path, "wb") as f:
    f.write(content.encode('utf-8'))

print(f"\nTotal fixes applied: {fixed_count}")
print(f"New file size: {len(content)} chars")

# 验证
with open(path, "r", encoding="utf-8") as f:
    verify_content = f.read()
    remaining = verify_content.count('\ufffd')
    print(f"Remaining replacement chars: {remaining}")
    
    if remaining == 0:
        print("✓ All encoding issues fixed!")
    else:
        print("⚠ Some issues remain, need manual inspection")
