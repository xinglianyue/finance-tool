# -*- coding: utf-8 -*-
"""最终解决方案：保留所有18条记录，但只保留最新一条的完整数据"""
import json
import os

input_file = r'C:\Users\xinxi\Desktop\财务工具\restored_data.json'
output_file = r'C:\Users\xinxi\Desktop\财务工具\shared-data.json'

# 读取原始数据（18条完整记录）
with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"原始记录数: {len(data)}")
print(f"原始大小: {os.path.getsize(input_file) / 1024 / 1024:.2f} MB")

# 按日期排序（最新的在前）
sorted_data = sorted(data, key=lambda x: x.get('date', ''), reverse=True)

# 找到最新记录（第一条）
latest_record = sorted_data[0]

# 构建压缩后的数据：
# 1. 第一条（最新）：保留完整数据
# 2. 后面17条历史记录只有元数据（日期、版本）
new_data = []

# 第一条：最新记录的完整数据
new_data.append(latest_record)

# 后面17条：历史元数据
for record in sorted_data[1:]:
    new_data.append({
        'date': record.get('date'),
        'version': record.get('version', 1),
        'type': 'history_meta'
    })

# 保存（紧凑格式，无空格）
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(new_data, f, ensure_ascii=False, separators=(',', ':'))

# 获取文件大小
file_size = os.path.getsize(output_file)
print(f"\n压缩后大小: {file_size / 1024:.2f} KB")
print(f"压缩率: {(1 - file_size / os.path.getsize(input_file)) * 100:.1f}%")
print(f"最终记录数: {len(new_data)} (1条完整数据 + 17条元数据)")
print(f"第一条（完整数据）: {new_data[0]['date']}, isLatest={new_data[0].get('isLatest')}")
print(f"第二条（元数据）: {new_data[1]['date']}")
print(f"最后一条（元数据）: {new_data[-1]['date']}")
