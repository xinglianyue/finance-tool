# -*- coding: utf-8 -*-
"""深度优化 shared-data.json - 只保留最新记录"""
import sys
import io
import json
import os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

input_path = r"C:\Users\xinxi\Desktop\财务工具\shared-data.json"
output_path = r"C:\Users\xinxi\Desktop\财务工具\shared-data.json"

print("=" * 70)
print("优化 shared-data.json")
print("=" * 70)

# 读取原始数据
print(f"\n[步骤1] 读取原始数据...")
with open(input_path, "r", encoding="utf-8") as f:
    original_size = os.path.getsize(input_path)
    data = json.load(f)

print(f"  原始大小: {original_size:,} bytes ({original_size/1024/1024:.2f} MB)")
print(f"  记录数量: {len(data)} 条")

# 找到最新记录
latest = None
for item in data:
    if item.get('isLatest', False):
        latest = item
        break

if not latest:
    # 按日期排序找最新的
    sorted_data = sorted(data, key=lambda x: x.get('date', ''), reverse=True)
    latest = sorted_data[0] if sorted_data else None

if latest:
    print(f"  最新记录: {latest.get('date', 'N/A')}")
    
    # 只保留最新记录和必要的元数据
    optimized_data = [latest]
    
    # 也保留历史记录列表（不含详细数据）
    history_meta = []
    for item in data:
        if item != latest:
            history_meta.append({
                'date': item.get('date'),
                'version': item.get('version'),
                'isHistorical': True
            })
    
    # 添加历史记录元数据作为第一条
    if history_meta:
        optimized_data.insert(0, {
            'type': 'history_meta',
            'history': history_meta
        })
else:
    print("  ✗ 未找到最新记录！")
    sys.exit(1)

# 压缩 JSON
print(f"\n[步骤2] 压缩 JSON...")
compressed = json.dumps(optimized_data, ensure_ascii=False, separators=(',', ':'))
optimized_size = len(compressed.encode('utf-8'))

print(f"  优化后大小: {optimized_size:,} bytes ({optimized_size/1024/1024:.2f} MB)")
print(f"  压缩比例: {(1 - optimized_size/original_size)*100:.1f}%")

# 保存文件
print(f"\n[步骤3] 保存优化后的文件...")
with open(output_path, "w", encoding="utf-8") as f:
    f.write(compressed)

print(f"  ✓ 已保存到: {output_path}")

# 验证
print(f"\n[步骤4] 验证优化后的文件...")
with open(output_path, "r", encoding="utf-8") as f:
    verify_data = json.load(f)

print(f"  ✓ 验证成功！")
print(f"  - 记录数量: {len(verify_data)} 条")
print(f"  - 数据类型: {type(verify_data).__name__}")

if isinstance(verify_data, list) and len(verify_data) > 0:
    first = verify_data[0]
    print(f"  - 第一条类型: {first.get('type', 'data_record')}")
    if first.get('type') == 'history_meta':
        print(f"  - 历史记录数: {len(first.get('history', []))}")
    else:
        print(f"  - 日期: {first.get('date', 'N/A')}")
        print(f"  - merchantData keys: {list(first.get('merchantData', {}).keys())[:5]}")

print("\n" + "=" * 70)
print(f"优化完成！")
print(f"原始大小: {original_size:,} bytes ({original_size/1024/1024:.2f} MB)")
print(f"优化大小: {optimized_size:,} bytes ({optimized_size/1024/1024:.2f} MB)")
print(f"节省空间: {original_size - optimized_size:,} bytes ({(1 - optimized_size/original_size)*100:.1f}%)")
print("=" * 70)
