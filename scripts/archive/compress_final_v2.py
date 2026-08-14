# -*- coding: utf-8 -*-
"""最终解决方案：只保留最新记录的完整数据 + 历史元数据摘要"""
import json
import os

input_file = r'C:\Users\xinxi\Desktop\财务工具\restored_data.json'
output_file = r'C:\Users\xinxi\Desktop\财务工具\shared-data.json'

# 读取原始数据（18条完整记录）
with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"原始记录数: {len(data)}")
print(f"原始大小: {os.path.getsize(input_file) / 1024 / 1024:.2f} MB")

# 找到最新记录（isLatest=true 或第一条）
latest_record = None
for record in data:
    if record.get('isLatest'):
        latest_record = record
        break

if not latest_record and data:
    # 按日期排序，取最新的
    sorted_data = sorted(data, key=lambda x: x.get('date', ''), reverse=True)
    latest_record = sorted_data[0]

# 构建压缩后的数据：
# 1. 所有历史记录只有元数据（日期、版本）
# 2. 最新一条保留完整数据
new_data = []

# 添加历史元数据（倒序，最新的在前）
for record in sorted(data, key=lambda x: x.get('date', ''), reverse=True):
    if not record.get('isLatest'):
        new_data.append({
            'date': record.get('date'),
            'version': record.get('version', 1),
            'type': 'history_meta'  # 标记这是历史元数据
        })

# 添加最新记录的完整数据
if latest_record:
    new_data.append(latest_record)

# 保存（紧凑格式，无空格）
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(new_data, f, ensure_ascii=False, separators=(',', ':'))

# 获取文件大小
file_size = os.path.getsize(output_file)
print(f"\n压缩后大小: {file_size / 1024:.2f} KB")
print(f"压缩率: {(1 - file_size / os.path.getsize(input_file)) * 100:.1f}%")
print(f"最终记录数: {len(new_data)}")
print(f"第一条（元数据）: {new_data[0]['date']}")
print(f"第二条（完整数据）: {new_data[-1]['date']}")
