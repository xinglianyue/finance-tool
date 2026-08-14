# -*- coding: utf-8 -*-
"""修改data-store.js，避免覆盖已定义的DataStore"""
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\js\data-store.js"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"Original size: {len(content)} chars")

# 找到最后一行的 export 逻辑并修改
old_export = """// 创建全局实例
window.DataStore = new DataStore();

// 导出（如果使用模块化环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataStore;
}"""

new_export = """// 创建全局实例（只在未定义时创建）
if (!window.DataStore) {
  window.DataStore = new DataStore();
  console.log('[DataStore] 从 data-store.js 初始化');
} else {
  console.log('[DataStore] 已存在，跳过初始化');
}

// 导出（如果使用模块化环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataStore;
}"""

if old_export in content:
    content = content.replace(old_export, new_export)
    print("✓ Modified export logic to prevent overwriting")
else:
    print("⚠ Could not find exact export pattern, trying alternative...")
    # 尝试更宽松的匹配
    if 'window.DataStore = new DataStore()' in content:
        content = content.replace(
            'window.DataStore = new DataStore();',
            'if (!window.DataStore) { window.DataStore = new DataStore(); }'
        )
        print("✓ Modified with simpler pattern")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nSaved! New size: {len(content)} chars")
