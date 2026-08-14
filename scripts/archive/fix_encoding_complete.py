# -*- coding: utf-8 -*-
"""彻底修复所有编码问题"""
import sys
import io
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"File size: {len(content)} chars")

# 定义修复映射 - GBK编码被误读为UTF-8的情况
replacements = [
    # 常见短语
    ('版本变更', '版本变更'),  # 确保正确
    ('，强制刷新加载最新资源)', '，强制刷新加载最新资源）'),
    ('数据已保存)', '数据已保存）'),
    ('数据加载失败', '数据加载失败'),
    
    # 城市名称
    ('承德市', '承德市'),
    ('承德', '承德'),
    ('围场满族蒙古族自治县', '围场满族蒙古族自治县'),
    ('围场县', '围场满族蒙古族自治县'),  # 简化为全称
    ('康保县', '康保'),
    ('康保', '康保'),
    ('玉田县', '玉田'),
    ('玉田', '玉田'),
    
    # 其他乱码
    ('鐗堟湰鍙樻洿', '版本变更'),
    ('锛屽己鍒跺埛鏂板姞杞芥渶鏂拌祫婧?', '，强制刷新加载最新资源）'),
    ('鏁版嵁宸蹭繚瀛?', '数据已保存）'),
    ('鏁版嵁鍔犺浇澶辫触', '数据加载失败'),
    ('鎵垮痉甯?', '承德市'),
    ('鎵垮痉', '承德'),
    ('鍥村満婊℃棌钂欏彜鏃忚嚜娌诲幙', '围场满族蒙古族自治县'),
    ('鍥村満鍘?', '围场'),
    ('搴蜂繚鍘?', '康保'),
    ('搴蜂繚', '康保'),
    ('鐜夌敯鍘?', '玉田'),
    ('鐜夌敯', '玉田'),
    
    # 更多乱码模式
    ('鍔犺浇', '加载'),
    ('鏁版嵁', '数据'),
    ('鍒嗘瀽', '分析'),
    ('鍒嗘瀽宸ュ叿', '分析工具'),
    ('缇庡洟', '美团'),
    ('浠ｇ悊鍟?', '代理商'),
    ('涓撶敤', '专用'),
    ('璐㈠姟', '财务'),
    ('鐗堟湰', '版本'),
    ('妫€娴?', '检测'),
    ('鎵嬫満', '手机'),
    ('绉诲姩绔?鍏崇ǹ锛屽噺灏戣祫婧愬崰鐢?'（'移动优化，减少资源占用''),
]

fixed_count = 0
for bad, good in replacements:
    count = content.count(bad)
    if count > 0:
        content = content.replace(bad, good)
        fixed_count += count
        print(f"Fixed: '{bad}' -> '{good}' ({count} times)")

# 检查剩余问题
remaining_garbled = ['鐗', '鏁', '鎵', '閾', '鍔', '璐', '缃', '鍩', '甯', '鍘', '鍖']
remaining_count = 0
for char in remaining_garbled:
    remaining_count += content.count(char)

if remaining_count > 0:
    print(f"\n⚠ Still have {remaining_count} garbled characters")
    # 找出包含乱码的行
    lines = content.split('\n')
    for i, line in enumerate(lines, start=1):
        for char in remaining_garbled:
            if char in line:
                print(f"  Line {i}: {line[:80]}")
                break
else:
    print("\n✓ All garbled text fixed!")

# 重新写入
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nTotal fixes: {fixed_count}")
print(f"New file size: {len(content)} chars")
