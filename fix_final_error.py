# -*- coding: utf-8 -*-
import re

file_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 修复多余的 })();
old_code = """      // 创建全局实例
      if (!window.StateManager) {
        window.StateManager = new StateManager();
        console.log('[StateManager] 全局实例已创建（内联版）');
      } else {
        console.log('[StateManager] 全局实例已存在，跳过创建');
      }
    })();
  </script>"""

new_code = """      // 创建全局实例
      if (!window.StateManager) {
        window.StateManager = new StateManager();
        console.log('[StateManager] 全局实例已创建（内联版）');
      } else {
        console.log('[StateManager] 全局实例已存在，跳过创建');
      }
  </script>"""

if old_code in content:
    content = content.replace(old_code, new_code)
    print("Fixed: Removed extra })();")
else:
    print("Pattern not found, searching for alternative...")
    # Try to find and fix it
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if i > 260 and i < 290 and '})();' in line and 'console.log' in lines[i-1]:
            print(f"Found problematic code at line {i+1}: {line.strip()}")
            # Check if previous lines contain the StateManager creation
            if '全局实例已存在' in lines[i-1]:
                lines[i] = ''  # Remove this line
                content = '\n'.join(lines)
                print("Fixed by removing line")
                break

# Save the fixed content
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved!")
