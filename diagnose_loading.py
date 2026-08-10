# -*- coding: utf-8 -*-
"""诊断并修复数据加载问题"""
import sys
import io
import json
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 70)
print("诊断数据加载问题")
print("=" * 70)

# 1. 检查 JSON 文件格式
json_path = r"C:\Users\xinxi\Desktop\财务工具\shared-data.json"
with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"\n[1] JSON 文件格式:")
print(f"  - 类型: {type(data).__name__}")
print(f"  - 长度: {len(data)} 项")

if isinstance(data, list) and len(data) > 0:
    first = data[0]
    print(f"  - 第一项类型: {first.get('type', 'N/A')}")
    
    if first.get('type') == 'history_meta':
        print(f"  - 历史记录数: {len(first.get('history', []))}")
        
        # 检查最新记录
        if len(data) > 1:
            latest = data[-1]
            print(f"\n[2] 最新记录信息:")
            print(f"  - 日期: {latest.get('date', 'N/A')}")
            print(f"  - isLatest: {latest.get('isLatest', False)}")
            
            merchant_data = latest.get('merchantData', {})
            print(f"  - merchantData keys: {list(merchant_data.keys())}")
        else:
            print(f"\n⚠ 警告: 只有历史记录，没有最新数据！")
    else:
        print(f"  ⚠ 第一项不是 history_meta 格式")

# 2. 检查 index-new.html 中的数据加载逻辑
html_path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"\n[3] 检查数据处理逻辑:")

# 查找 cloudData 处理相关的代码
patterns = [
    ('cloudData 赋值', r'cloudData\s*=\s*.*?\.json\(\)'),
    ('buildV3Data 调用', r'buildV3Data\s*\('),
    ('history_meta 处理', r'history_meta'),
    ('云端数据为空', r'云端数据为空'),
]

for name, pattern in patterns:
    matches = re.findall(pattern, content)
    print(f"  - {name}: {'找到' if matches else '未找到'} ({len(matches)} 处)")

# 3. 查找错误消息的来源
error_msg = "云端数据为空或解析失败"
if error_msg in content:
    idx = content.find(error_msg)
    start = max(0, idx - 200)
    end = min(len(content), idx + 200)
    context = content[start:end]
    print(f"\n[4] 错误消息上下文:")
    print(f"  ...{context}...")

print("\n" + "=" * 70)
