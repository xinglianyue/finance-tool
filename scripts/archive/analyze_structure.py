# -*- coding: utf-8 -*-
"""深度优化 shared-data.json"""
import sys
import io
import json
import os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

input_path = r"C:\Users\xinxi\Desktop\财务工具\shared-data.json"

print("=" * 70)
print("深度分析 shared-data.json 结构")
print("=" * 70)

with open(input_path, "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"\n数据类型: {type(data).__name__}")

if isinstance(data, list):
    print(f"数组长度: {len(data)}")
    
    # 分析第一项的结构
    if len(data) > 0:
        first_item = data[0]
        print(f"\n第一项类型: {type(first_item).__name__}")
        
        if isinstance(first_item, dict):
            print(f"第一项的键: {list(first_item.keys())[:10]}")
            
            # 统计每个键的数据量
            key_stats = {}
            for key in first_item.keys():
                val = first_item[key]
                if isinstance(val, (int, float)):
                    key_stats[key] = ('number', 1)
                elif isinstance(val, str):
                    key_stats[key] = ('string', len(val))
                elif isinstance(val, list):
                    key_stats[key] = ('list', len(val))
                elif isinstance(val, dict):
                    key_stats[key] = ('dict', len(val))
                else:
                    key_stats[key] = ('other', 0)
            
            print("\n各项数据统计:")
            for key, (vtype, vsize) in sorted(key_stats.items(), key=lambda x: -x[1][1]):
                print(f"  {key}: {vtype} ({vsize})")

print("\n" + "=" * 70)
