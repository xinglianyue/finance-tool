# -*- coding: utf-8 -*-
"""
数据恢复脚本
功能：恢复被覆盖的历史数据，保留 5 月 31 日数据
"""

import json
import os

print("═══════════════════════════════════════════")
print("       财务数据恢复工具 v1.0")
print("═══════════════════════════════════════════")
print()

# 1. 读取本地历史数据（8 条）
print("【步骤 1】读取本地历史数据...")
with open(r"c:\Users\xinxi\Desktop\财务工具\shared-data.json", 'r', encoding='utf-8') as f:
    historical_data = json.load(f)

print(f"✅ 本地历史数据：{len(historical_data)} 条")
for record in historical_data:
    print(f"   - {record['date']}")

# 2. 读取 5 月 31 日数据（从 Git 最新提交）
print()
print("【步骤 2】读取 Git 最新提交的数据...")
os.system('git show 5e58567:shared-data.json > temp_may31.json 2>nul')

try:
    with open(r"c:\Users\xinxi\Desktop\财务工具\temp_may31.json", 'r', encoding='utf-8') as f:
        may31_data = json.load(f)
    
    print(f"✅ Git 最新提交数据：{len(may31_data)} 条")
    for record in may31_data:
        print(f"   - {record['date']} ({record.get('uploadedBy', 'N/A')})")
    
    # 3. 合并数据
    print()
    print("【步骤 3】合并数据...")
    
    # 创建日期索引
    existing_dates = {r['date'] for r in historical_data}
    
    # 添加不存在的数据
    for record in may31_data:
        if record['date'] not in existing_dates:
            historical_data.append(record)
            print(f"   ✅ 添加：{record['date']}")
        else:
            print(f"   ⚠️ 跳过（已存在）: {record['date']}")
    
    # 按日期排序
    historical_data.sort(key=lambda x: x.get('date', ''), reverse=True)
    
    print()
    print(f"✅ 合并完成！总记录数：{len(historical_data)}")
    
    # 4. 保存合并后的数据
    output_file = r"c:\Users\xinxi\Desktop\财务工具\shared-data-restored.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(historical_data, f, ensure_ascii=False, indent=2)
    
    print(f"   输出文件：{output_file}")
    
    # 5. 清理临时文件
    if os.path.exists(r"c:\Users\xinxi\Desktop\财务工具\temp_may31.json"):
        os.remove(r"c:\Users\xinxi\Desktop\财务工具\temp_may31.json")
    
    print()
    print("═══════════════════════════════════════════")
    print("✅ 数据恢复完成！")
    print("═══════════════════════════════════════════")
    print()
    print("下一步操作:")
    print("1. 检查 shared-data-restored.json 是否正确")
    print("2. 手动上传到 GitHub main 分支")
    print("3. 或者运行：git add shared-data-restored.json && git commit && git push")
    
except Exception as e:
    print(f"❌ 读取失败：{e}")
    print("请手动从 GitHub 下载 shared-data.json")
