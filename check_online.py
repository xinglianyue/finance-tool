# -*- coding: utf-8 -*-
import subprocess
import json

# 使用 git show 获取线上数据
result = subprocess.run(
    ['git', 'show', 'origin/main:shared-data.json'],
    capture_output=True,
    text=True,
    encoding='utf-8'
)

if result.returncode == 0:
    data = json.loads(result.stdout)
    print(f"线上总记录数：{len(data)}")
    for i, record in enumerate(data):
        print(f"{i+1}. {record.get('date', 'N/A')} - {record.get('fileName', 'N/A')}")
else:
    print(f"获取失败：{result.stderr}")
