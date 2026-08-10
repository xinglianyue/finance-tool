# -*- coding: utf-8 -*-
"""修复数据格式处理和脚本加载问题"""
import sys
import io
import re
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"当前文件大小: {len(content)} chars")

# 生成新版本号
new_ts = str(int(time.time()))
print(f"新版本号: {new_ts}")

# 1. 修复数据格式处理：保持 cloudData 为数组
old_compat = '''        // 兼容新格式：如果有 history_meta，提取最新记录
        if (Array.isArray(cloudData) && cloudData.length > 0 && cloudData[0].type === 'history_meta') {
          const latestRecord = cloudData.find(item => item.date);
          if (latestRecord) {
            cloudData = latestRecord;
            console.log('[App] 使用新格式数据');
          }
        }'''

new_compat = '''        // 兼容新格式：如果有 history_meta，提取最新记录
        if (Array.isArray(cloudData) && cloudData.length > 0 && cloudData[0].type === 'history_meta') {
          const latestRecord = cloudData.find(item => item.date);
          if (latestRecord) {
            // 保持为数组格式，便于后续处理
            cloudData = [latestRecord];
            console.log('[App] 使用新格式数据');
          }
        }'''

if old_compat in content:
    content = content.replace(old_compat, new_compat)
    print("✓ 已修复数据格式处理（保持数组格式）")
else:
    print("⚠ 未找到预期的兼容性代码")

# 2. 在 </head> 前添加缺失的脚本引用
if '<script src="js/state-manager.js"' not in content:
    # 找到 </head> 标签
    head_end = content.find('</head>')
    if head_end > 0:
        # 添加缺失的脚本
        missing_scripts = f'''
  <script src="js/state-manager.js?v={new_ts}"></script>
  <script src="js/xlsx.full.min.js?v={new_ts}"></script>
  <script src="js/chart.umd.min.js?v={new_ts}"></script>
'''
        content = content[:head_end] + missing_scripts + content[head_end:]
        print("✓ 已添加缺失的脚本引用")
    else:
        print("⚠ 未找到 </head> 标签")

# 3. 更新版本号
content = re.sub(r"APP_VERSION = '\d+'", f"APP_VERSION = '{new_ts}'", content)
content = re.sub(r'v=\d+', f'v={new_ts}', content)
print(f"✓ 版本更新为 {new_ts}")

# 4. 保存文件
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✓ 文件已保存，新大小: {len(content)} chars")

# 5. 验证
with open(path, "r", encoding="utf-8") as f:
    verify = f.read()

checks = [
    ('无 forEach 错误风险', 'cloudData = latestRecord;' not in verify),
    ('有 state-manager.js 引用', 'state-manager.js' in verify),
    ('版本正确', new_ts in verify),
]

print("\n验证结果:")
all_pass = True
for name, result in checks:
    status = 'PASS' if result else 'FAIL'
    print(f"  [{status}] {name}")
    if not result:
        all_pass = False

if all_pass:
    print("\n✓ 所有检查通过！")
else:
    print("\n✗ 有些检查失败了")

print(f"\n执行: git add index-new.html && git commit -m 'fix: 修复数据格式和脚本加载 v{new_ts}' && git push")
