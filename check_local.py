# -*- coding: utf-8 -*-
import json

# 读取本地数据
with open('shared-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=== 本地 shared-data.json 数据 ===")
print(f"总记录数：{len(data)}")
print()
print("记录列表:")
for i, record in enumerate(data, 1):
    date = record.get('date', 'N/A')
    uploaded_by = record.get('uploadedBy', 'N/A')
    print(f"{i}. {date} ({uploaded_by})")

# 保存为临时文件供检查
with open('data-list.txt', 'w', encoding='utf-8') as f:
    f.write(f"总记录数：{len(data)}\n")
    f.write("\n".join([f"{i}. {r.get('date', 'N/A')} ({r.get('uploadedBy', 'N/A')})" for i, r in enumerate(data, 1)]))

print("\n已保存到 data-list.txt")
