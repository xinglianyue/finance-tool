# -*- coding: utf-8 -*-
import json

with open('shared-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"总记录数：{len(data)}")
for i, record in enumerate(data):
    print(f"{i+1}. {record.get('date', 'N/A')} - {record.get('fileName', 'N/A')}")
