# -*- coding: utf-8 -*-
"""使用 gzip 压缩 JSON 数据 - 保留所有 18 条记录"""
import json
import gzip
import os

input_file = r'C:\Users\xinxi\Desktop\财务工具\restored_data.json'
output_file = r'C:\Users\xinxi\Desktop\财务工具\shared-data.json.gz'

# 读取原始数据
with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"原始记录数: {len(data)}")
print(f"原始大小: {os.path.getsize(input_file) / 1024 / 1024:.2f} MB")

# 将数据转换为紧凑的 JSON 字符串
json_str = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
print(f"JSON 字符串大小: {len(json_str) / 1024:.2f} KB")

# 使用 gzip 压缩
compressed_data = gzip.compress(json_str.encode('utf-8'), compresslevel=9)

# 保存压缩后的文件
with open(output_file, 'wb') as f:
    f.write(compressed_data)

# 获取压缩后的大小
compressed_size = os.path.getsize(output_file)
print(f"压缩后大小: {compressed_size / 1024:.2f} KB")
print(f"压缩率: {(1 - compressed_size / len(json_str)) * 100:.1f}%")

# 验证解压
with gzip.open(output_file, 'rb') as f:
    decompressed = json.loads(f.read().decode('utf-8'))
print(f"解压后记录数: {len(decompressed)}")
print(f"解压后第一条日期: {decompressed[0]['date']}")
print(f"解压后最后一条日期: {decompressed[-1]['date']}")
