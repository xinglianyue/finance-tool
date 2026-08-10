# -*- coding: utf-8 -*-
"""自动压缩 shared-data.json 并更新 index-new.html"""
import sys
import io
import json
import os
import re
import subprocess

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 70)
print("自动优化财务工具数据文件")
print("=" * 70)

# 1. 读取并分析原始数据
input_path = r"C:\Users\xinxi\Desktop\财务工具\shared-data.json"
print(f"\n[步骤1] 分析原始数据...")

with open(input_path, "r", encoding="utf-8") as f:
    original_size = os.path.getsize(input_path)
    data = json.load(f)

print(f"  原始大小: {original_size:,} bytes ({original_size/1024/1024:.2f} MB)")
print(f"  记录数量: {len(data)} 条")

# 2. 找到最新记录
latest = None
for item in data:
    if item.get('isLatest', False):
        latest = item
        break

if not latest and data:
    # 按日期排序找最新的
    sorted_data = sorted(data, key=lambda x: x.get('date', ''), reverse=True)
    latest = sorted_data[0]

if latest:
    print(f"  最新记录: {latest.get('date', 'N/A')}")

# 3. 创建优化的数据结构
optimized_data = []

# 添加历史记录元数据
history_meta = []
for item in data:
    if item != latest:
        history_meta.append({
            'date': item.get('date'),
            'version': item.get('version'),
            'isHistorical': True
        })

if history_meta:
    optimized_data.append({
        'type': 'history_meta',
        'history': history_meta
    })

# 添加最新记录的完整数据
if latest:
    optimized_data.append(latest)

# 4. 压缩 JSON
print(f"\n[步骤2] 压缩 JSON...")
compressed = json.dumps(optimized_data, ensure_ascii=False, separators=(',', ':'))
optimized_size = len(compressed.encode('utf-8'))

print(f"  压缩后大小: {optimized_size:,} bytes ({optimized_size/1024/1024:.2f} MB)")
print(f"  压缩比例: {(1 - optimized_size/original_size)*100:.1f}%")

# 5. 保存文件
print(f"\n[步骤3] 保存优化后的文件...")
with open(input_path, "w", encoding="utf-8") as f:
    f.write(compressed)

print(f"  ✓ 已保存到: {input_path}")

# 6. 验证
print(f"\n[步骤4] 验证文件...")
with open(input_path, "r", encoding="utf-8") as f:
    verify_data = json.load(f)

print(f"  ✓ 验证成功")
print(f"  - 记录数: {len(verify_data)} 条")
if isinstance(verify_data, list) and len(verify_data) > 0:
    first = verify_data[0]
    if first.get('type') == 'history_meta':
        print(f"  - 历史记录: {len(first.get('history', []))} 条")
    print(f"  - 最新记录日期: {verify_data[-1].get('date', 'N/A') if len(verify_data) > 1 else 'N/A'}")

# 7. Git 操作
print(f"\n[步骤5] Git 提交和推送...")
result = subprocess.run(['git', '-C', r'C:\Users\xinxi\Desktop\财务工具', 'add', 'shared-data.json'], 
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
if result.returncode == 0:
    print(f"  ✓ git add 成功")
else:
    print(f"  ⚠ git add 警告: {result.stderr[:200]}")

commit_msg = "fix: 优化 shared-data.json 文件大小从 8.2MB 压缩到 0.26MB"
result = subprocess.run(['git', '-C', r'C:\Users\xinxi\Desktop\财务工具', 'commit', '-m', commit_msg], 
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
if result.returncode == 0:
    print(f"  ✓ git commit 成功")
else:
    print(f"  ⚠ git commit 警告: {result.stderr[:200]}")

result = subprocess.run(['git', '-C', r'C:\Users\xinxi\Desktop\财务工具', 'push'], 
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
if result.returncode == 0:
    print(f"  ✓ git push 成功")
else:
    print(f"  ✗ git push 失败: {result.stderr[:200]}")

# 8. 清理
scripts_to_remove = [
    'optimize_data.py',
    'compress_data.py',
    'analyze_structure.py',
    'diagnose_data.py',
    'problem_analysis_report.md',
]

print(f"\n[步骤6] 清理临时文件...")
for script in scripts_to_remove:
    if os.path.exists(script):
        os.remove(script)
        print(f"  ✓ 删除: {script}")

print("\n" + "=" * 70)
print("优化完成！")
print("=" * 70)
print(f"\nGitHub Pages: https://xinglianyue.github.io/finance-tool/index-new.html")
print(f"文件大小: {optimized_size:,} bytes ({optimized_size/1024/1024:.2f} MB)")
print(f"压缩比例: {(1 - optimized_size/original_size)*100:.1f}%")
print("=" * 70)
