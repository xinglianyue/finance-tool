# -*- coding: utf-8 -*-
"""激进压缩 shared-data.json - 只保留最新记录的完整数据"""
import json
import os

input_file = r'C:\Users\xinxi\Desktop\财务工具\restored_data.json'
output_file = r'C:\Users\xinxi\Desktop\财务工具\shared-data.json'

# 读取原始数据
with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"原始记录数: {len(data)}")
print(f"原始大小: {os.path.getsize(input_file) / 1024 / 1024:.2f} MB")

# 找到最新记录（isLatest=true）
latest_record = None
for record in data:
    if record.get('isLatest'):
        latest_record = record
        break

if not latest_record:
    # 如果没有标记为最新的，取第一条
    latest_record = data[0]

# 构建压缩后的数据：只保留最新记录的完整数据 + 历史元数据
new_data = []

# 添加历史记录摘要（只保留日期和版本）
for record in data:
    if not record.get('isLatest'):
        new_data.append({
            'date': record.get('date'),
            'version': record.get('version', 1),
            'type': 'history_meta'
        })

# 添加最新记录的完整数据
new_data.append(latest_record)

# 保存（紧凑格式）
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(new_data, f, ensure_ascii=False, separators=(',', ':'))

# 获取文件大小
file_size = os.path.getsize(output_file)
print(f"压缩后大小: {file_size / 1024:.2f} KB")
print(f"压缩率: {(1 - file_size / os.path.getsize(input_file)) * 100:.1f}%")
print(f"最终记录数: {len(new_data)}")
print(f"\n第一条记录日期: {new_data[0]['date']}")
print(f"最后一条记录日期: {new_data[-1]['date']} (完整数据)")
