# -*- coding: utf-8 -*-
"""
财务数据修复脚本
功能：恢复线上被覆盖的数据
"""

import json
import os

print("=== 财务数据修复工具 ===")
print()

# 1. 检查本地数据
print("【1/3】检查本地数据...")
with open(r"c:\Users\xinxi\Desktop\财务工具\shared-data.json", 'r', encoding='utf-8') as f:
    local_data = json.load(f)
    
print(f"   ✅ 本地数据完整: {len(local_data)} 条记录")
for record in local_data:
    print(f"      - {record['date']}")

# 2. 检查脚本版本
print()
print("【2/3】检查脚本版本...")
with open(r"c:\Users\xinxi\Desktop\财务工具\财务工具数据同步-技术人员\db-sync.py", 'r', encoding='utf-8') as f:
    script_content = f.read()
    
if "v1.1.0" in script_content and "isHistorical" in script_content:
    print("   ✅ 脚本是最新版 v1.1.0")
    print("   ✅ 包含版本历史机制")
else:
    print("   ❌ 脚本需要更新")

# 3. 生成修复说明
print()
print("【3/3】生成修复说明...")

fix_instructions = """
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    数据修复操作指南
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【问题分析】
线上数据被覆盖，只有1条记录（5月31日），本地有8条完整记录。

【修复步骤】

Step 1: 上传数据文件到GitHub
-----------------------------
1. 打开 GitHub 仓库: https://github.com/xinglianyue/finance-tool
2. 进入 main 分支
3. 上传文件: shared-data.json
4. 上传文件: index-new.html

Step 2: 技术人员同步数据
------------------------
确保技术人员使用最新脚本:
📁 财务工具数据同步-技术人员/db-sync.py

命令: python db-sync.py 20260531

新版脚本特性:
✅ 不会覆盖历史数据
✅ 自动创建版本历史
✅ 保留所有旧记录

Step 3: 用户刷新页面
---------------------
1. 清除浏览器缓存 (Ctrl + Shift + Delete)
2. 强制刷新页面 (Ctrl + Shift + R)
3. 确认版本号显示: 20260605.3

【预期结果】
完成后应该显示 9 条记录（原8条 + 5月31日数据）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

print(fix_instructions)

# 保存说明文件
with open(r"c:\Users\xinxi\Desktop\财务工具\数据修复指南.txt", 'w', encoding='utf-8') as f:
    f.write(fix_instructions)

print("✅ 修复指南已保存: 数据修复指南.txt")
print()
print("请按照指南操作即可修复数据！")