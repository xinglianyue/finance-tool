
import json
from datetime import datetime

# 读取 preloaded_data.json
with open('preloaded_data.json', 'r', encoding='utf-8') as f:
    preloaded = json.load(f)

# 我们找到最新的数据
dates = list(preloaded.keys())
dates.sort()
latest_date = dates[-1]
latest_data = preloaded[latest_date]

print("找到 preloaded_data 中的最新数据:", latest_date)
print("全量商家城市数量:", len(latest_data['all']['cities']))

# 读取当前的 shared-data.json
try:
    with open('shared-data.json', 'r', encoding='utf-8') as f:
        shared_data = json.load(f)
    print("当前 shared-data 中有", len(shared_data), "条记录")
except FileNotFoundError:
    print("shared-data.json 不存在，将创建新文件")
    shared_data = []

# 创建新的记录
new_record = {
    "date": latest_date,
    "updatedAt": datetime.now().isoformat(),
    "uploadedBy": "local-fix",
    "fileName": "preloaded_data " + latest_date,
    "currentData": {
        "date": latest_date,
        "cities": latest_data['all']['cities'],
        "fileName": "preloaded_data " + latest_date,
    },
    "merchantData": {},
    "currentMerchant": "all",
}

# 添加所有商家类型的数据
for merchant_type, merchant_info in latest_data.items():
    new_record["merchantData"][merchant_type] = {
        "label": merchant_info["label"],
        "cities": merchant_info["cities"],
    }

# 检查是否已经有同月份的记录，有则替换，没有则添加
new_month = latest_date[:7]
found = False

for i, rec in enumerate(shared_data):
    rec_date = rec.get("currentData", {}).get("date", "")
    rec_month = rec_date[:7]
    if rec_month == new_month:
        shared_data[i] = new_record
        found = True
        print("已替换", new_month, "月份的记录")
        break

if not found:
    shared_data.append(new_record)
    print("已添加", new_month, "月份的新记录")

# 保存到 shared-data.json
with open('shared-data.json', 'w', encoding='utf-8') as f:
    json.dump(shared_data, f, ensure_ascii=False, indent=2)

print("shared-data.json 已修复完成！现在有", len(shared_data), "条记录")
print("当前数据包含", len(latest_data['all']['cities']), "个城市")
