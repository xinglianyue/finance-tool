# -*- coding: utf-8 -*-
"""
修复 db-sync.py 严重 Bug
问题：读取现有数据失败时，没有中止同步，导致用空列表覆盖所有数据
"""

import os
import re

script_path = r"c:\Users\xinxi\Desktop\财务工具\财务工具数据同步-技术人员\db-sync.py"

with open(script_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 找到 push_to_github 函数中的问题代码
old_code = '''        if response.status_code == 200:
            try:
                content = base64.b64decode(response.json()["content"]).decode("utf-8")
                existing_data = json.loads(content)
                print(f"       检测到 {len(existing_data)} 条现有记录")
            except:
                print("       读取现有数据失败，将创建新文件")
        else:
            print("       现有数据不存在，将创建新文件")

        existing_data = existing_data.copy()'''

new_code = '''        if response.status_code == 200:
            try:
                content_b64 = response.json()["content"]
                content_str = base64.b64decode(content_b64).decode("utf-8")
                existing_data = json.loads(content_str)
                print(f"       检测到 {len(existing_data)} 条现有记录")
                
                # 验证数据结构
                if not isinstance(existing_data, list):
                    print(f"        错误：现有数据格式不正确（不是列表）")
                    return False
                    
            except Exception as e:
                print(f"       ❌ 读取现有数据失败：{e}")
                print(f"       ⚠️ 安全保护：中止同步，避免覆盖数据！")
                return False
        else:
            print(f"       GitHub API 返回：{response.status_code}")
            print("       现有数据不存在，将创建新文件")

        existing_data = existing_data.copy()'''

# 替换
content = content.replace(old_code, new_code)

# 保存
with open(script_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 脚本已修复！")
print()
print("修复内容:")
print("1. 读取失败时立即返回 False，中止同步")
print("2. 添加详细错误信息")
print("3. 验证数据结构")
print()
print("下一步：推送修复后的脚本到 GitHub")
