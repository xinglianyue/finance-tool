# -*- coding: utf-8 -*-
"""修复云端加载失败导致整个页面崩溃的问题"""

import os

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_fail_block = """      } catch (err) {
        console.log('[App] 云端数据加载失败:', err);
        // V3: fallback to index.json parsing
        console.log('[App] 尝试从 index.json 解析数据...');
      }"""

new_fail_block = """      } catch (err) {
        console.warn('[App] 云端数据保存到本地存储失败(不影响使用):', err.message);
        // 继续执行，不阻塞渲染
      }"""

if old_fail_block in content:
    content = content.replace(old_fail_block, new_fail_block)
    print("OK - 替换了 loadFromCloud catch block")
else:
    print("WARN - 找不到旧代码块，可能已经被修改过")

old_fallback = """      // 云端无数据或加载失败，显示空状态
      showEmptyState();
      
      // 尝试从 localStorage 恢复（V3）
      const savedData = DataStore.load();
      if (!savedData || Object.keys(savedData).length === 0) {
        console.warn('[Init] localStorage 为空或无效');
        renderEmptyState();
        return;
      }"""

new_fallback = """      // 云端无数据或加载失败，显示空状态
      console.warn('[App] 云端加载异常，检查本地缓存...');
      
      // 安全回退：不使用 DataStore API，直接从原始 localStorage 读取
      let savedData = null;
      try {
        const raw = localStorage.getItem('finance-tool');
        if (raw) savedData = JSON.parse(raw);
      } catch(e) {
        console.warn('[App] 本地缓存读取失败:', e.message);
      }
      if (!savedData || !Object.keys(savedData).length) {
        console.warn('[Init] 无任何可用数据');
        showEmptyState();
        return;
      }"""

if old_fallback in content:
    content = content.replace(old_fallback, new_fallback)
    print("OK - 替换了 window.onload fallback")
else:
    print("WARN - 找不到fallback代码块")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\n完成! 文件已保存 ({len(content)} chars)")
