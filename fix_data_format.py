# -*- coding: utf-8 -*-
"""修复数据格式：保留所有18条记录的完整数据"""
import json
import os

# 从git恢复原始完整数据
input_file = r'C:\Users\xinxi\Desktop\财务工具\restored_data.json'

with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"原始记录数: {len(data)}")
print(f"原始大小: {os.path.getsize(input_file) / 1024 / 1024:.2f} MB")

# 直接保存所有数据（不做压缩）
output_file = r'C:\Users\xinxi\Desktop\财务工具\shared-data.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

file_size = os.path.getsize(output_file)
print(f"\n文件大小: {file_size / 1024 / 1024:.2f} MB ({file_size / 1024:.2f} KB)")
print(f"记录数: {len(data)}")
print(f"第一条日期: {data[0]['date']}")
print(f"最后一条日期: {data[-1]['date']}")
