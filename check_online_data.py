# -*- coding: utf-8 -*-
import requests
import json

print("=== 检查线上数据状态 ===\n")

try:
    # 检查线上数据
    url = "https://raw.githubusercontent.com/xinglianyue/finance-tool/main/shared-data.json"
    response = requests.get(url, timeout=10)
    
    if response.status_code == 200:
        online_data = response.json()
        print(f"✅ 线上数据记录数：{len(online_data)}")
        print()
        print("记录列表:")
        for i, record in enumerate(online_data, 1):
            date = record.get("date", "N/A")
            uploaded_by = record.get("uploadedBy", "N/A")
            version = record.get("version", 1)
            is_latest = record.get("isLatest", "N/A")
            is_historical = record.get("isHistorical", "N/A")
            print(f"{i}. {date} | {uploaded_by} | v{version} | latest={is_latest} | historical={is_historical}")
        
        print()
        if len(online_data) == 1:
            print("❌ 问题确认：线上只有 1 条记录，数据被覆盖了！")
        elif len(online_data) >= 8:
            print("✅ 数据完整：历史记录都在")
    else:
        print(f"❌ 无法访问线上数据：{response.status_code}")
        
except Exception as e:
    print(f"❌ 检查失败：{e}")

print()
print("=== 检查本地数据状态 ===\n")

try:
    with open(r"c:\Users\xinxi\Desktop\财务工具\shared-data.json", 'r', encoding='utf-8') as f:
        local_data = json.load(f)
    
    print(f"✅ 本地数据记录数：{len(local_data)}")
    print()
    print("记录列表:")
    for i, record in enumerate(local_data, 1):
        date = record.get("date", "N/A")
        uploaded_by = record.get("uploadedBy", "N/A")
        print(f"{i}. {date} | {uploaded_by}")
        
except Exception as e:
    print(f"❌ 读取本地数据失败：{e}")
