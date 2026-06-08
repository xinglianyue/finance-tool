# -*- coding: utf-8 -*-
"""
从 GitHub 获取线上数据并合并历史记录
"""

import json
import requests

print("═══════════════════════════════════════════")
print("       数据恢复工具")
print("═══════════════════════════════════════════")
print()

# 1. 获取线上数据
print("【步骤 1】获取线上最新数据...")
url = "https://raw.githubusercontent.com/xinglianyue/finance-tool/main/shared-data.json"

try:
    response = requests.get(url, timeout=10)
    
    if response.status_code == 200:
        online_data = response.json()
        print(f"✅ 线上数据：{len(online_data)} 条")
        for record in online_data:
            print(f"   - {record['date']} ({record.get('uploadedBy', 'N/A')})")
    else:
        print(f"❌ 下载失败：{response.status_code}")
        print("请手动从浏览器下载：")
        print("https://raw.githubusercontent.com/xinglianyue/finance-tool/main/shared-data.json")
        print("然后保存为 shared-data-online.json")
        input("按回车退出...")
        exit()
        
except Exception as e:
    print(f"❌ 错误：{e}")
    input("按回车退出...")
    exit()

# 2. 读取本地历史数据
print()
print("【步骤 2】读取本地历史数据...")
with open(r"c:\Users\xinxi\Desktop\财务工具\shared-data.json", 'r', encoding='utf-8') as f:
    local_data = json.load(f)

print(f"✅ 本地历史数据：{len(local_data)} 条")
for record in local_data:
    print(f"   - {record['date']}")

# 3. 合并数据
print()
print("【步骤 3】合并所有数据...")

existing_dates = {r['date'] for r in online_data}
added_count = 0

for record in local_data:
    if record['date'] not in existing_dates:
        online_data.append(record)
        print(f"   ✅ 添加：{record['date']}")
        added_count += 1
    else:
        print(f"   ️ 跳过（已存在）: {record['date']}")

# 按日期排序
online_data.sort(key=lambda x: x.get('date', ''), reverse=True)

print()
print(f"✅ 合并完成！总记录数：{len(online_data)}")
print()
print("合并后的数据:")
for i, record in enumerate(online_data, 1):
    print(f"{i}. {record['date']} ({record.get('uploadedBy', 'N/A')})")

# 4. 保存合并后的数据
output_file = r"c:\Users\xinxi\Desktop\财务工具\shared-data-final.json"
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(online_data, f, ensure_ascii=False, indent=2)

print()
print("═══════════════════════════════════════════")
print("✅ 数据合并完成！")
print("═══════════════════════════════════════════")
print()
print(f"输出文件：{output_file}")
print(f"总记录数：{len(online_data)}")
print()
print("下一步操作:")
print("1. 检查 shared-data-final.json 是否正确")
print("2. 上传到 GitHub main 分支")
print("3. 命令:")
print("   git checkout main")
print("   git add shared-data-final.json")
print("   git commit -m '恢复完整数据：10 条记录'")
print("   git push origin main --force")
