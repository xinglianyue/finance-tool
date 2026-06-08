# -*- coding: utf-8 -*-
"""检查线上最新数据状态"""
import subprocess
import json

# 获取 main 分支最新数据
result = subprocess.run(
    ['git', 'show', 'origin/main:shared-data.json'],
    capture_output=True,
    text=True,
    encoding='utf-8'
)

if result.returncode == 0:
    data = json.loads(result.stdout)
    print(f"✅ 线上数据状态")
    print(f"   总记录数：{len(data)}")
    print(f"   数据列表:")
    for i, record in enumerate(data, 1):
        date = record.get('date', 'N/A')
        source = record.get('uploadedBy', 'unknown')
        print(f"   {i}. {date} (来源：{source})")
    
    # 检查是否有 5 月 31 日的数据
    may31_records = [r for r in data if r.get('date', '').startswith('2026-05-31')]
    print(f"\n   5 月 31 日数据：{len(may31_records)} 条")
    
    # 检查历史数据
    historical = [r for r in data if not r.get('date', '').startswith('2026-05-31')]
    print(f"   历史数据：{len(historical)} 条")
else:
    print(f"❌ 获取失败：{result.stderr}")
