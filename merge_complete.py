# -*- coding: utf-8 -*-
"""
合并线上数据和本地历史数据
"""

import json
import subprocess

print("═══════════════════════════════════════════")
print("       数据合并工具")
print("═══════════════════════════════════════════")
print()

# 1. 获取线上数据
print("【步骤 1】获取线上数据...")
result = subprocess.run(
    ['git', 'show', 'd1d893c:shared-data.json'],
    capture_output=True,
    text=True,
    encoding='utf-8'
)

if result.returncode == 0:
    online_data = json.loads(result.stdout)
    print(f"✅ 线上数据：{len(online_data)} 条")
    for r in online_data:
        print(f"   - {r['date']} ({r.get('uploadedBy', 'N/A')})")
else:
    print(f"❌ 获取失败")
    exit()

# 2. 读取本地历史数据
print()
print("【步骤 2】读取本地历史数据...")
with open(r"c:\Users\xinxi\Desktop\财务工具\shared-data.json", 'r', encoding='utf-8') as f:
    local_data = json.load(f)

print(f"✅ 本地历史数据：{len(local_data)} 条")
for r in local_data:
    print(f"   - {r['date']} ({r.get('uploadedBy', 'N/A')})")

# 3. 合并数据
print()
print("【步骤 3】合并所有数据...")

existing_dates = {r['date'] for r in online_data}
added_count = 0

for record in local_data:
    # 检查日期是否已存在
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
for i, r in enumerate(online_data, 1):
    print(f"{i}. {r['date']} ({r.get('uploadedBy', 'N/A')})")

# 4. 保存合并后的数据
output_file = r"c:\Users\xinxi\Desktop\财务工具\shared-data-complete.json"
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
print("1. 检查 shared-data-complete.json 是否正确")
print("2. 上传到 GitHub:")
print("   git checkout main")
print("   git add shared-data-complete.json")
print("   git commit -m '恢复完整数据：10 条记录'")
print("   git push origin main --force")
