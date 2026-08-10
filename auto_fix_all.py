# -*- coding: utf-8 -*-
"""自动完成所有修复并部署到GitHub Pages"""
import sys
import io
import re
import time
import subprocess

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 70)
print("自动修复财务工具")
print("=" * 70)

# 1. 检查并修复 index-new.html
html_path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"\n[步骤1] 检查 index-new.html...")
print(f"  当前大小: {len(content)} chars")

# 生成新时间戳
new_ts = str(int(time.time()))
print(f"  新版本号: {new_ts}")

# 替换所有旧版本号
old_versions = ['1786176922', '1786176038', '1786175554', '1786174882']
for v in old_versions:
    if v in content:
        content = content.replace(v, new_ts)
        print(f"  替换: {v} -> {new_ts}")

# 确保有正确的脚本引用
if 'state-manager.js' not in content:
    # 添加缺失的脚本引用
    scripts_to_add = '''
  <script src="js/state-manager.js?v={version}"></script>
  <script src="js/xlsx.full.min.js?v={version}"></script>
  <script src="js/chart.umd.min.js?v={version}"></script>
'''.format(version=new_ts)
    
    # 在 DataStore 初始化后添加
    ds_end = content.find('</script>', content.find('DataStore'))
    if ds_end > 0:
        content = content[:ds_end+9] + scripts_to_add + content[ds_end+9:]
        print("  已添加缺失的脚本引用")

# 更新注释中的版本号
content = re.sub(r'<!-- v\d+ -->', f'<!-- v{new_ts} -->', content)

# 保存文件
with open(html_path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"  ✓ 文件已保存")

# 2. 验证 data-store.js
ds_path = r"C:\Users\xinxi\Desktop\财务工具\js\data-store.js"
with open(ds_path, "r", encoding="utf-8") as f:
    ds_content = f.read()

print(f"\n[步骤2] 检查 js/data-store.js...")
print(f"  文件大小: {len(ds_content)} bytes")

if 'class DataStore' not in ds_content:
    print("  ✗ ERROR: class DataStore 未找到!")
    sys.exit(1)

if 'window.DataStore = new DataStore()' not in ds_content:
    print("  ✗ ERROR: window.DataStore 导出未找到!")
    sys.exit(1)

print("  ✓ data-store.js 正确")

# 3. 验证 state-manager.js
sm_path = r"C:\Users\xinxi\Desktop\财务工具\js\state-manager.js"
with open(sm_path, "r", encoding="utf-8") as f:
    sm_content = f.read()

print(f"\n[步骤3] 检查 js/state-manager.js...")
print(f"  文件大小: {len(sm_content)} bytes")

if 'class StateManager' not in sm_content:
    print("  ✗ ERROR: class StateManager 未找到!")
    sys.exit(1)

if 'initialize(' in sm_content:
    print("  ✓ state-manager.js 正确（有 initialize 方法）")
else:
    print("  ✗ ERROR: initialize 方法未找到!")
    sys.exit(1)

# 4. Git 提交和推送
print(f"\n[步骤4] Git 提交和推送...")

# Add
result = subprocess.run(['git', '-C', r'C:\Users\xinxi\Desktop\财务工具', 'add', 'index-new.html', 'js/data-store.js', 'js/state-manager.js'], 
                       capture_output=True, text=True)
if result.returncode != 0:
    print(f"  ⚠ git add 警告: {result.stderr}")
else:
    print("  ✓ git add 成功")

# Commit
commit_msg = f"fix: 自动修复所有问题 - DataStore/StateManager - v{new_ts}"
result = subprocess.run(['git', '-C', r'C:\Users\xinxi\Desktop\财务工具', 'commit', '-m', commit_msg], 
                       capture_output=True, text=True)
if result.returncode != 0:
    print(f"  ⚠ git commit 警告: {result.stderr}")
else:
    print(f"  ✓ git commit 成功: {commit_msg}")

# Push
result = subprocess.run(['git', '-C', r'C:\Users\xinxi\Desktop\财务工具', 'push'], 
                       capture_output=True, text=True)
if result.returncode != 0:
    print(f"  ✗ git push 失败: {result.stderr}")
    sys.exit(1)
else:
    print("  ✓ git push 成功")

# 5. 清理工作区
print(f"\n[步骤5] 清理临时文件...")
import os
scripts = [
    'force_purge.py',
    'fix_datastore_complete.py',
    'fix_encoding_final.py',
    'fix_missing_deps.py',
    'final_fix_v2.py',
    'inline_only_fix.py',
    'proper_fix.py',
    'robust_fix.py',
    'fix_statemanager.py',
]
for script in scripts:
    if os.path.exists(script):
        os.remove(script)
        print(f"  ✓ 删除: {script}")

print("\n" + "=" * 70)
print("修复完成！")
print("=" * 70)
print(f"\nGitHub Pages 地址: https://xinglianyue.github.io/finance-tool/index-new.html")
print(f"版本号: v{new_ts}")
print(f"\n请测试: Ctrl+Shift+N (Chrome 无痕模式)")
print("=" * 70)
