# -*- coding: utf-8 -*-
"""检查数据加载问题"""
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
    print(f"线上数据详情:")
    print(f"总记录数：{len(data)}\n")
    
    for i, record in enumerate(data, 1):
        print(f"{i}. 日期：{record.get('date', 'N/A')}")
        print(f"   来源：{record.get('uploadedBy', 'unknown')}")
        print(f"   文件名：{record.get('fileName', 'N/A')}")
        
        # 检查数据结构
        if 'currentData' in record:
            cd = record['currentData']
            print(f"   currentData.date: {cd.get('date', 'N/A')}")
            print(f"   currentData.cities 数量：{len(cd.get('cities', []))}")
        
        if 'merchantData' in record:
            md = record['merchantData']
            types = list(md.keys())
            print(f"   merchantData 类型：{types}")
        
        print()
else:
    print(f"获取失败：{result.stderr}")
