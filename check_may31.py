# -*- coding: utf-8 -*-
"""检查两条 5 月 31 日记录的详细信息"""
import subprocess
import json

# 获取线上最新数据
result = subprocess.run(
    ['git', 'show', 'origin/main:shared-data.json'],
    capture_output=True,
    text=True,
    encoding='utf-8'
)

if result.returncode == 0:
    data = json.loads(result.stdout)
    print(f"总记录数：{len(data)}\n")
    
    may31_records = []
    for i, record in enumerate(data):
        if record.get('date', '').startswith('2026-05-31'):
            may31_records.append((i, record))
            print(f"记录 {i+1}:")
            print(f"  日期：{record.get('date', 'N/A')}")
            print(f"  来源：{record.get('uploadedBy', 'unknown')}")
            print(f"  文件名：{record.get('fileName', 'N/A')}")
            print(f"  更新时间：{record.get('updatedAt', 'N/A')}")
            print(f"  isLatest: {record.get('isLatest', 'N/A')}")
            print(f"  version: {record.get('version', 'N/A')}")
            print()
    
    print(f"\n5 月 31 日记录共 {len(may31_records)} 条")
    if len(may31_records) == 2:
        idx1, rec1 = may31_records[0]
        idx2, rec2 = may31_records[1]
        
        print(f"\n需要删除：记录 {idx1+1} (先上传的)")
        print(f"保留：记录 {idx2+1} (后上传的)")
else:
    print(f"获取失败：{result.stderr}")
