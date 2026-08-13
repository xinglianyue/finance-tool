# -*- coding: utf-8 -*-
"""压缩 shared-data.json 并保持所有 18 条记录"""
import json
import os

input_file = r'C:\Users\xinxi\Desktop\财务工具\restored_data.json'
output_file = r'C:\Users\xinxi\Desktop\财务工具\shared-data.json'

# 读取原始数据
with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"原始记录数: {len(data)}")
print(f"原始大小: {os.path.getsize(input_file) / 1024 / 1024:.2f} MB")

# 精简数据结构 - 只保留必要字段
new_data = []
for record in data:
    new_record = {
        'date': record.get('date'),
        'merchantData': {
            'all': record.get('merchantData', {}).get('all', {}),
            'city': record.get('merchantData', {}).get('city', {}),
            'ka': record.get('merchantData', {}).get('ka', {})
        },
        'version': record.get('version', 1),
        'isLatest': record.get('isLatest', False)
    }
    new_data.append(new_record)

# 保存（紧凑格式）
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(new_data, f, ensure_ascii=False, separators=(',', ':'))

# 获取文件大小
file_size = os.path.getsize(output_file)
print(f"压缩后大小: {file_size / 1024:.2f} KB")
print(f"压缩率: {(1 - file_size / os.path.getsize(input_file)) * 100:.1f}%")
print(f"最终记录数: {len(new_data)}")
