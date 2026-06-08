# -*- coding: utf-8 -*-
"""
恢复被覆盖的 8 条历史数据
"""

import json
import os

print("═══════════════════════════════════════════")
print("       恢复历史数据工具")
print("═══════════════════════════════════════════")
print()

# 1. 读取本地 8 条历史数据
print("【步骤 1】读取本地历史数据...")
with open(r"c:\Users\xinxi\Desktop\财务工具\shared-data.json", 'r', encoding='utf-8') as f:
    historical_data = json.load(f)

print(f"✅ 本地历史数据：{len(historical_data)} 条")
for record in historical_data:
    print(f"   - {record['date']}")

# 2. 从 Git 获取最新的 2 条数据
print()
print("【步骤 2】获取线上最新数据...")
os.system('git show HEAD:shared-data.json > temp_current.json 2>nul')

try:
    with open(r"c:\Users\xinxi\Desktop\财务工具\temp_current.json", 'r', encoding='utf-8') as f:
        current_data = json.load(f)
    
    print(f"✅ 线上当前数据：{len(current_data)} 条")
    for record in current_data:
        print(f"   - {record['date']}")
    
    # 3. 合并数据
    print()
    print("【步骤 3】合并所有数据...")
    
    existing_dates = {r['date'] for r in current_data}
    
    for record in historical_data:
        if record['date'] not in existing_dates:
            current_data.append(record)
            print(f"   ✅ 添加：{record['date']}")
        else:
            print(f"   ️ 跳过（已存在）: {record['date']}")
    
    # 按日期排序
    current_data.sort(key=lambda x: x.get('date', ''), reverse=True)
    
    print()
    print(f"✅ 合并完成！总记录数：{len(current_data)}")
    print()
    print("合并后的数据:")
    for i, record in enumerate(current_data, 1):
        print(f"{i}. {record['date']} ({record.get('uploadedBy', 'N/A')})")
    
    # 4. 保存合并后的数据
    output_file = r"c:\Users\xinxi\Desktop\财务工具\shared-data-restored.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(current_data, f, ensure_ascii=False, indent=2)
    
    print()
    print("═══════════════════════════════════════════")
    print("✅ 数据恢复完成！")
    print("═══════════════════════════════════════════")
    print()
    print(f"输出文件：{output_file}")
    print()
    print("下一步操作:")
    print("1. 检查文件是否正确（应该有 10 条记录）")
    print("2. 手动上传到 GitHub main 分支")
    print("3. 或者运行以下命令:")
    print("   git add shared-data-restored.json")
    print("   git commit -m '恢复完整数据：10 条记录'")
    print("   git push origin main --force")
    
    # 清理临时文件
    if os.path.exists(r"c:\Users\xinxi\Desktop\财务工具\temp_current.json"):
        os.remove(r"c:\Users\xinxi\Desktop\财务工具\temp_current.json")
    
except Exception as e:
    print(f"❌ 错误：{e}")
    print("请手动从 GitHub 下载 shared-data.json")
