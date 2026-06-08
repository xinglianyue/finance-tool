# -*- coding: utf-8 -*-
import requests
import base64
import json

def check_github_script():
    """检查GitHub上的脚本是否是最新版"""
    url = "https://raw.githubusercontent.com/xinglianyue/finance-tool/main/财务工具数据同步-技术人员/db-sync.py"
    try:
        response = requests.get(url)
        content = response.text
        
        # 检查是否包含版本历史机制
        if "isHistorical" in content and "isLatest" in content and "version" in content:
            print("✅ GitHub上的脚本是最新版（包含版本历史机制）")
        else:
            print("❌ GitHub上的脚本是旧版（没有版本历史机制）")
            
        # 检查版本号
        if "v1.1.0" in content:
            print("✅ 版本号: v1.1.0")
        else:
            print("⚠️ 版本号不符")
            
        return content
        
    except Exception as e:
        print(f"❌ 无法访问GitHub: {e}")
        return None

def check_github_data():
    """检查GitHub上的shared-data.json"""
    url = "https://raw.githubusercontent.com/xinglianyue/finance-tool/main/shared-data.json"
    try:
        response = requests.get(url)
        data = response.json()
        
        print(f"\n=== 线上数据检查 ===")
        print(f"记录数: {len(data)}")
        
        if len(data) == 1:
            print("❌ 线上数据只有1条！说明被覆盖了")
            print(f"唯一记录: {data[0].get('date', 'N/A')}")
        elif len(data) >= 8:
            print("✅ 线上数据完整")
            for record in data:
                print(f"  - {record.get('date')} | v{record.get('version', 1)}")
        else:
            print(f"⚠️ 记录数异常: {len(data)}条")
            
        return data
        
    except Exception as e:
        print(f"❌ 无法访问线上数据: {e}")
        return None

def check_local_data():
    """检查本地数据"""
    with open(r"c:\Users\xinxi\Desktop\财务工具\shared-data.json", 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    print(f"\n=== 本地数据检查 ===")
    print(f"记录数: {len(data)}")
    for record in data:
        print(f"  - {record.get('date')}")

# 执行检查
print("=== GitHub脚本检查 ===")
check_github_script()

check_github_data()
check_local_data()

print("\n=== 结论 ===")
print("如果线上数据只有1条，说明技术人员用了旧脚本")
print("解决方案：重新上传本地完整数据到GitHub")