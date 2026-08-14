# -*- coding: utf-8 -*-
"""正确压缩 shared-data.json - 保留所有 18 条记录"""
import json
import os

input_file = r'C:\Users\xinxi\Desktop\财务工具\restored_data.json'
output_file = r'C:\Users\xinxi\Desktop\财务工具\shared-data.json'

# 读取原始数据
with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"原始记录数: {len(data)}")
print(f"原始大小: {os.path.getsize(input_file) / 1024 / 1024:.2f} MB")

# 移除嵌套的冗余数据，只保留必要的字段
new_data = []
for record in data:
    new_record = {
        'date': record.get('date'),
        'merchantData': record.get('merchantData', {}),
        'version': record.get('version', 1),
        'isLatest': record.get('isLatest', False)
    }
    new_data.append(new_record)

# 保存（不压缩，只移除冗余）
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(new_data, f, ensure_ascii=False)

# 获取文件大小
file_size = os.path.getsize(output_file)
print(f"压缩后大小: {file_size / 1024:.2f} KB")
print(f"压缩率: {(1 - file_size / os.path.getsize(input_file)) * 100:.1f}%")
print(f"最终记录数: {len(new_data)}")
print(f"日期范围: {new_data[0]['date']} ~ {new_data[-1]['date']}")
