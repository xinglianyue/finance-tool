# -*- coding: utf-8 -*-
"""
从 GitHub 下载线上数据
"""

import requests
import json

print("正在从 GitHub 下载线上数据...")

# 使用 GitHub API 获取线上数据
url = "https://raw.githubusercontent.com/xinglianyue/finance-tool/main/shared-data.json"

try:
    response = requests.get(url, timeout=10)
    
    if response.status_code == 200:
        online_data = response.json()
        
        print(f"✅ 线上数据记录数：{len(online_data)}")
        print()
        print("记录列表:")
        for i, record in enumerate(online_data, 1):
            date = record.get('date', 'N/A')
            uploaded_by = record.get('uploadedBy', 'N/A')
            print(f"{i}. {date} ({uploaded_by})")
        
        # 保存线上数据
        with open(r"c:\Users\xinxi\Desktop\财务工具\shared-data-online.json", 'w', encoding='utf-8') as f:
            json.dump(online_data, f, ensure_ascii=False, indent=2)
        
        print()
        print("✅ 已保存到：shared-data-online.json")
        
        # 检查是否只有 5 月 31 日数据
        if len(online_data) == 1 and online_data[0].get('date') == '2026-05-31':
            print()
            print("⚠️ 确认：线上只有 5 月 31 日数据（历史数据被覆盖）")
            print("需要合并本地历史数据")
            
            # 读取本地历史数据
            with open(r"c:\Users\xinxi\Desktop\财务工具\shared-data.json", 'r', encoding='utf-8') as f:
                local_data = json.load(f)
            
            # 合并
            merged_data = online_data + local_data
            merged_data.sort(key=lambda x: x.get('date', ''), reverse=True)
            
            print()
            print(f"✅ 合并完成！总记录数：{len(merged_data)}")
            
            # 保存合并后的数据
            with open(r"c:\Users\xinxi\Desktop\财务工具\shared-data-merged.json", 'w', encoding='utf-8') as f:
                json.dump(merged_data, f, ensure_ascii=False, indent=2)
            
            print("✅ 已保存到：shared-data-merged.json")
            print()
            print("下一步：上传 shared-data-merged.json 到 GitHub")
        else:
            print()
            print("✅ 线上数据完整，无需恢复")
            
    else:
        print(f"❌ 下载失败：{response.status_code}")
        
except Exception as e:
    print(f"❌ 错误：{e}")
    print("请手动从浏览器下载：")
    print("https://raw.githubusercontent.com/xinglianyue/finance-tool/main/shared-data.json")
