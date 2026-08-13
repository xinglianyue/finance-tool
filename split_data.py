# -*- coding: utf-8 -*-
"""分片保存数据：最新记录完整 + 历史记录元数据"""
import json
import os

input_file = r'C:\Users\xinxi\Desktop\财务工具\restored_data.json'

with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"原始记录数: {len(data)}")

# 按日期排序（最新的在前）
sorted_data = sorted(data, key=lambda x: x.get('date', ''), reverse=True)

# 构建新数据：第一条完整，后面的是元数据
new_data = []

for i, record in enumerate(sorted_data):
    if i == 0:
        # 最新记录：保留完整数据
        new_data.append(record)
        print(f"第{i+1}条: {record['date']} (完整数据)")
    else:
        # 历史纪录：只保留元数据
        new_data.append({
            'date': record.get('date'),
            'version': record.get('version', 1),
            'type': 'history_meta'
        })
        print(f"第{i+1}条: {record['date']} (元数据)")

# 保存
output_file = r'C:\Users\xinxi\Desktop\财务工具\shared-data.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(new_data, f, ensure_ascii=False, separators=(',', ':'))

file_size = os.path.getsize(output_file)
print(f"\n✅ 文件大小: {file_size / 1024:.2f} KB")
print(f"✅ 记录数: {len(new_data)} (1条完整 + {len(new_data)-1}条元数据)")
print(f"✅ 压缩率: {(1 - file_size / os.path.getsize(input_file)) * 100:.1f}%")
