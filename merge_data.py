# -*- coding: utf-8 -*-
"""
数据恢复脚本：合并历史数据和 5 月 31 日数据
"""

import json
import os

print("=== 数据恢复工具 ===\n")

# 1. 读取本地历史数据（8 条）
with open(r"c:\Users\xinxi\Desktop\财务工具\shared-data.json", 'r', encoding='utf-8') as f:
    historical_data = json.load(f)

print(f"✅ 本地历史数据：{len(historical_data)} 条")
for record in historical_data:
    print(f"   - {record['date']}")

# 2. 询问是否有 5 月 31 日数据文件
print()
print("请提供 5 月 31 日的数据文件路径（如果有）")
print("如果没有，将只恢复 8 条历史数据")

has_may31 = input("是否有 5 月 31 日的数据文件？(y/n): ").strip().lower()

if has_may31 == 'y':
    may31_file = input("请输入 5 月 31 日数据文件路径：").strip()
    try:
        with open(may31_file, 'r', encoding='utf-8') as f:
            may31_data = json.load(f)
        
        # 检查是否已经有 5 月 31 日数据
        has_may31_record = any(r.get('date') == '2026-05-31' for r in historical_data)
        
        if not has_may31_record:
            # 添加 5 月 31 日数据
            if isinstance(may31_data, list):
                historical_data.extend(may31_data)
            else:
                historical_data.append(may31_data)
            
            # 按日期排序
            historical_data.sort(key=lambda x: x.get('date', ''), reverse=True)
            
            print(f"✅ 已添加 5 月 31 日数据")
        else:
            print("⚠️ 5 月 31 日数据已存在")
            
    except Exception as e:
        print(f"❌ 读取 5 月 31 日数据失败：{e}")

# 3. 保存合并后的数据
output_file = r"c:\Users\xinxi\Desktop\财务工具\shared-data-merged.json"
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(historical_data, f, ensure_ascii=False, indent=2)

print()
print(f"✅ 合并完成！")
print(f"   总记录数：{len(historical_data)}")
print(f"   输出文件：{output_file}")
print()
print("下一步：手动上传到 GitHub")
