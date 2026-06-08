# -*- coding: utf-8 -*-
import subprocess

# 使用 git show 获取数据
result = subprocess.run(
    ['git', 'show', 'd1d893c:shared-data.json'],
    capture_output=True,
    text=True,
    encoding='utf-8'
)

if result.returncode == 0:
    import json
    data = json.loads(result.stdout)
    
    print(f"线上数据：{len(data)} 条")
    print()
    for i, r in enumerate(data, 1):
        print(f"{i}. {r['date']} ({r.get('uploadedBy', 'N/A')})")
else:
    print(f"错误：{result.stderr}")
