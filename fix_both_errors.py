# -*- coding: utf-8 -*-
import re

file_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 错误1: 移除多余的 return store; 和 })();
# 找到 DataStore 初始化结束的位置并修复
old_pattern1 = """      console.log('[Init] DataStore.setCache is:', typeof window.DataStore.setCache);
      
      return store;
    })();"""

new_pattern1 = """      console.log('[Init] DataStore.setCache is:', typeof window.DataStore.setCache);"""

if old_pattern1 in content:
    content = content.replace(old_pattern1, new_pattern1)
    print("Fixed error 1: Removed 'return store; })();'")
else:
    print("Error 1 pattern not found, trying alternative...")
    # Try to find and fix it differently
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'return store;' in line and i > 130 and i < 150:
            print(f"Found 'return store;' at line {i+1}")
            # Remove this line and the next two lines ( })(); and empty line)
            if i+2 < len(lines) and '})();' in lines[i+1]:
                lines[i] = ''
                lines[i+1] = ''
                lines[i+2] = ''
                content = '\n'.join(lines)
                print("Fixed error 1 by removing lines")
                break

# 错误2: 修复 setTimeout 位置错误
# 原来的代码结构：
#         }
#         // 等待数据完全加载后再渲染
#         setTimeout(() => {
#           ...
#         }, 500);
#
#         syncToGlobals() {
# 
# 应该改成：
#         }
#         
#         // 等待数据完全加载后再渲染
#         setTimeout(() => {
#           ...
#         }, 500);
#       
#         syncToGlobals() {
# 
# 不，等等，这样还是错的。setTimeout 应该在 initialize 方法内部。

old_pattern2 = """          console.log('[StateManager] 状态初始化完成', this.state);
          this.notify('init', this.state);
        }
        // 等待数据完全加载后再渲染
        setTimeout(() => {
          console.log('[App] 延迟渲染维度表，allMerchantData:', !!window.allMerchantData);
          if (window.allMerchantData && Object.keys(window.allMerchantData).length > 0) {
            renderDimensionTable();
          } else {
            console.warn('[App] 数据仍未准备好，等待用户交互');
          }
        }, 500);

        
        syncToGlobals() {"""

new_pattern2 = """          console.log('[StateManager] 状态初始化完成', this.state);
          this.notify('init', this.state);
          
          // 等待数据完全加载后再渲染
          setTimeout(() => {
            console.log('[App] 延迟渲染维度表，allMerchantData:', !!window.allMerchantData);
            if (window.allMerchantData && Object.keys(window.allMerchantData).length > 0) {
              renderDimensionTable();
            } else {
              console.warn('[App] 数据仍未准备好，等待用户交互');
            }
          }, 500);
        }
        
        syncToGlobals() {"""

if old_pattern2 in content:
    content = content.replace(old_pattern2, new_pattern2)
    print("Fixed error 2: Moved setTimeout inside initialize method")
else:
    print("Error 2 pattern not found exactly, checking...")
    # Let's just show what we have around line 220
    lines = content.split('\n')
    for i in range(215, 235):
        if i < len(lines):
            print(f"{i+1}: {lines[i][:80]}")

# Save the fixed content
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nFile saved!")
