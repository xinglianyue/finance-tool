# -*- coding: utf-8 -*-
"""验证新数据格式的兼容性"""
import sys
import io
import json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 70)
print("验证数据格式兼容性")
print("=" * 70)

# 读取新的共享数据文件
json_path = r"C:\Users\xinxi\Desktop\财务工具\shared-data.json"
with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"\n[1] 新数据文件格式:")
print(f"  - 类型: {type(data).__name__}")
print(f"  - 长度: {len(data)} 项")

if isinstance(data, list) and len(data) > 0:
    # 第一项应该是历史记录元数据
    first = data[0]
    if first.get('type') == 'history_meta':
        print(f"  - 第一项: 历史记录元数据")
        print(f"    * 历史记录数量: {len(first.get('history', []))}")
    
    # 第二项应该是最新记录
    if len(data) > 1:
        latest = data[-1]
        print(f"\n[2] 最新记录信息:")
        print(f"  - 日期: {latest.get('date', 'N/A')}")
        print(f"  - 版本: {latest.get('version', 'N/A')}")
        print(f"  - isLatest: {latest.get('isLatest', False)}")
        
        merchant_data = latest.get('merchantData', {})
        if merchant_data:
            print(f"  - merchantData 键数量: {len(merchant_data)}")
            for key in list(merchant_data.keys())[:3]:
                val = merchant_data[key]
                if isinstance(val, list):
                    print(f"    * {key}: list ({len(val)} 项)")
                elif isinstance(val, dict):
                    print(f"    * {key}: dict ({len(val)} keys)")
                else:
                    print(f"    * {key}: {type(val).__name__}")

# 检查 index-new.html 中的数据处理逻辑
html_path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"\n[3] index-new.html 数据处理逻辑:")

# 查找 buildV3Data 函数
if 'buildV3Data' in content:
    print("  ✓ 检测到 buildV3Data 函数")
    
    # 提取函数定义
    import re
    match = re.search(r'function buildV3Data\(.*?\{.*?\n  \}', content, re.DOTALL)
    if match:
        func_code = match.group(0)[:500]
        print(f"  函数预览 (前500字符):")
        for line in func_code.split('\n')[:10]:
            print(f"    {line}")
else:
    print("  ✗ 未找到 buildV3Data 函数")

# 检查是否有处理 history_meta 的逻辑
if 'history_meta' in content:
    print("  ✓ 已包含 history_meta 处理逻辑")
else:
    print("  ⚠ 未找到 history_meta 处理逻辑")

print("\n" + "=" * 70)
print("验证完成！")
print("=" * 70)
