# -*- coding: utf-8 -*-
"""系统性诊断所有问题"""
import sys
import io
import json
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 70)
print("系统性诊断 - 财务工具")
print("=" * 70)

# 1. 检查所有相关文件的状态
files_to_check = [
    ("index-new.html", r"C:\Users\xinxi\Desktop\财务工具\index-new.html"),
    ("shared-data.json", r"C:\Users\xinxi\Desktop\财务工具\shared-data.json"),
    ("js/data-store.js", r"C:\Users\xinxi\Desktop\财务工具\js\data-store.js"),
    ("js/state-manager.js", r"C:\Users\xinxi\Desktop\财务工具\js\state-manager.js"),
]

print("\n[1] 检查文件状态...")
for name, path in files_to_check:
    import os
    if os.path.exists(path):
        size = os.path.getsize(path)
        print(f"  ✓ {name}: {size:,} bytes ({size/1024:.1f} KB)")
    else:
        print(f"  ✗ {name}: 文件不存在!")

# 2. 分析 shared-data.json 的结构
print("\n[2] 分析数据文件格式...")
with open(r"C:\Users\xinxi\Desktop\财务工具\shared-data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"  - 类型: {type(data).__name__}")
print(f"  - 长度: {len(data)} 项")

if isinstance(data, list) and len(data) > 0:
    first = data[0]
    print(f"  - 第一项类型: {first.get('type', 'N/A')}")
    
    if first.get('type') == 'history_meta':
        print(f"  - 历史记录数: {len(first.get('history', []))}")
        if len(data) > 1:
            latest = data[-1]
            print(f"  - 最新记录日期: {latest.get('date', 'N/A')}")
            print(f"  - merchantData keys: {list(latest.get('merchantData', {}).keys())}")

# 3. 分析 index-new.html 中的数据加载逻辑
print("\n[3] 分析 index-new.html 数据处理逻辑...")
with open(r"C:\Users\xinxi\Desktop\财务工具\index-new.html", "r", encoding="utf-8") as f:
    html = f.read()

# 查找关键代码段
checks = [
    ("DataStore 内联初始化", "window.DataStore = {" in html),
    ("state-manager.js 引用", 'src="js/state-manager.js"' in html),
    ("history_meta 处理", "history_meta" in html),
    ("cloudData.forEach", "cloudData.forEach" in html),
    ("buildV3Data 调用", "buildV3Data(" in html),
    ("StateManager.initialize 调用", "StateManager.initialize(" in html),
]

for name, result in checks:
    status = "✓" if result else "✗"
    print(f"  {status} {name}")

# 4. 分析潜在问题
print("\n[4] 潜在问题分析...")

problems = []

# 问题1: 数据格式与处理逻辑不匹配
if "history_meta" in html and "cloudData.forEach" in html:
    # 如果使用了新格式，cloudData 应该还是数组
    compat_code = """if (Array.isArray(cloudData) && cloudData.length > 0 && cloudData[0].type === 'history_meta') {
          const latestRecord = cloudData.find(item => item.date);
          if (latestRecord) {
            cloudData = [latestRecord];  // 保持数组格式
            console.log('[App] 使用新格式数据');
          }
        }"""
    if compat_code in html or "cloudData = [latestRecord]" in html:
        print("  ✓ 数据格式兼容性处理正确")
    else:
        problems.append("数据格式转换后可能不是数组")
        print("  ✗ 数据格式转换后可能不是数组")

# 问题2: 脚本加载顺序
scripts = re.findall(r'<script src="([^"]+)"', html)
print(f"\n  外部脚本引用: {scripts}")

# 问题3: StateManager 是否正确定义
with open(r"C:\Users\xinxi\Desktop\财务工具\js\state-manager.js", "r", encoding="utf-8") as f:
    sm = f.read()
if "class StateManager" in sm and "initialize(" in sm:
    print("  ✓ StateManager 类定义正确")
else:
    problems.append("StateManager 类定义可能有误")
    print("  ✗ StateManager 类定义可能有误")

# 5. 总结
print("\n" + "=" * 70)
print("诊断总结")
print("=" * 70)

if problems:
    print(f"\n发现 {len(problems)} 个问题:")
    for i, p in enumerate(problems, 1):
        print(f"  {i}. {p}")
else:
    print("\n✓ 未发现问题，所有组件应该正常工作")

print("\n建议下一步操作:")
print("  1. 如果需要修复，请明确指出具体问题")
print("  2. 如果一切正常，可以测试部署版本")
print("=" * 70)
