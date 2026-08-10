# -*- coding: utf-8 -*-
"""压缩 shared-data.json 文件"""
import sys
import io
import json
import os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

input_path = r"C:\Users\xinxi\Desktop\财务工具\shared-data.json"
output_path = r"C:\Users\xinxi\Desktop\财务工具\shared-data-compressed.json"

print("=" * 70)
print("压缩 shared-data.json")
print("=" * 70)

# 读取原始文件
print(f"\n[步骤1] 读取原始文件...")
with open(input_path, "r", encoding="utf-8") as f:
    original_size = os.path.getsize(input_path)
    print(f"  原始大小: {original_size:,} bytes ({original_size/1024/1024:.2f} MB)")

    # 先读为字符串，再解析
    content = f.read()
    
# 解析 JSON
print(f"\n[步骤2] 解析 JSON...")
data = json.loads(content)
print(f"  数据类型: {type(data).__name__}")

if isinstance(data, dict):
    print(f"  键数量: {len(data.keys())}")
    for key in list(data.keys())[:5]:
        val = data[key]
        if isinstance(val, dict):
            print(f"    - {key}: dict with {len(val)} keys")
        elif isinstance(val, list):
            print(f"    - {key}: list with {len(val)} items")
        else:
            print(f"    - {key}: {type(val).__name__}")

# 压缩 JSON
print(f"\n[步骤3] 压缩 JSON...")
compressed = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
compressed_size = len(compressed.encode('utf-8'))
print(f"  压缩后大小: {compressed_size:,} bytes ({compressed_size/1024/1024:.2f} MB)")
print(f"  压缩比例: {(1 - compressed_size/original_size)*100:.1f}%")

# 保存压缩后的文件
print(f"\n[步骤4] 保存压缩文件...")
with open(output_path, "w", encoding="utf-8") as f:
    f.write(compressed)

print(f"  ✓ 已保存到: {output_path}")

# 验证压缩后的文件可以正确加载
print(f"\n[步骤5] 验证压缩文件...")
with open(output_path, "r", encoding="utf-8") as f:
   验证数据 = json.load(f)
    
if isinstance(data, dict) and isinstance(验证数据, dict):
    if data.keys() == 验证数据.keys():
        print(f"  ✓ 验证成功：数据结构一致")
    else:
        print(f"  ✗ 警告：键不一致")
else:
    print(f"  ✓ 验证成功：数据类型一致")

print("\n" + "=" * 70)
print(f"压缩完成！")
print(f"原始大小: {original_size:,} bytes")
print(f"压缩大小: {compressed_size:,} bytes")
print(f"节省空间: {original_size - compressed_size:,} bytes ({(1 - compressed_size/original_size)*100:.1f}%)")
print("=" * 70)
