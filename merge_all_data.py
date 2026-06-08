# -*- coding: utf-8 -*-
"""
合并所有数据：8 条历史记录 + 5 月 31 日数据
"""

import json
import os

print("═══════════════════════════════════════════")
print("       数据合并工具 v1.0")
print("═══════════════════════════════════════════")
print()

# 1. 读取本地历史数据（8 条）
print("【步骤 1】读取本地历史数据...")
with open(r"c:\Users\xinxi\Desktop\财务工具\shared-data.json", 'r', encoding='utf-8') as f:
    historical_data = json.load(f)

print(f"✅ 本地历史数据：{len(historical_data)} 条")
for record in historical_data:
    print(f"   - {record['date']}")

# 2. 读取 5 月 31 日数据
print()
print("【步骤 2】读取 5 月 31 日数据...")
print("请提供 5 月 31 日数据文件路径")
print("示例：C:\\Users\\hp\\Desktop\\shared-data-20260531.json")

may31_file = input("文件路径：").strip()

if os.path.exists(may31_file):
    try:
        with open(may31_file, 'r', encoding='utf-8') as f:
            may31_data = json.load(f)
        
        # 如果是列表，取第一条（应该只有 5 月 31 日）
        if isinstance(may31_data, list):
            may31_record = may31_data[0] if may31_data else None
        else:
            may31_record = may31_data
        
        if may31_record:
            # 检查是否已有 5 月 31 日数据
            has_may31 = any(r.get('date') == '2026-05-31' for r in historical_data)
            
            if not has_may31:
                # 添加 5 月 31 日数据
                historical_data.append(may31_record)
                print(f"✅ 已添加：2026-05-31")
            else:
                print(f"⚠️ 5 月 31 日数据已存在")
            
            # 按日期排序
            historical_data.sort(key=lambda x: x.get('date', ''), reverse=True)
            
            print()
            print(f"✅ 合并完成！总记录数：{len(historical_data)}")
            print()
            print("合并后的数据:")
            for i, record in enumerate(historical_data, 1):
                date = record.get('date', 'N/A')
                uploaded_by = record.get('uploadedBy', 'N/A')
                print(f"{i}. {date} ({uploaded_by})")
            
            # 保存合并后的数据
            output_file = r"c:\Users\xinxi\Desktop\财务工具\shared-data-merged.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(historical_data, f, ensure_ascii=False, indent=2)
            
            print()
            print("═══════════════════════════════════════════")
            print("✅ 数据合并完成！")
            print("═══════════════════════════════════════════")
            print()
            print(f"输出文件：{output_file}")
            print()
            print("下一步操作:")
            print("1. 检查 merged.json 是否正确")
            print("2. 运行：git add shared-data-merged.json")
            print("3. 运行：git commit -m '恢复完整数据：9 条记录'")
            print("4. 运行：git push origin main --force")
        else:
            print("❌ 5 月 31 日数据为空")
            
    except Exception as e:
        print(f"❌ 读取失败：{e}")
else:
    print(f"❌ 文件不存在：{may31_file}")

print()
input("按回车键退出...")
