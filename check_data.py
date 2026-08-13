import json, sys

with open(r'C:\Users\xinxi\Desktop\财务工具\shared-data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

print(f'Records: {len(d)}')
print(f'First date: {d[0].get("date")}')
print(f'Last date: {d[-1].get("date")}')
for i, rec in enumerate(d):
    print(f'  [{i}] {rec.get("date")} (latest={rec.get("isLatest", False)})')
