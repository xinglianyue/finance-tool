# -*- coding: utf-8 -*-
"""从头创建干净的 index-new.html 初始化部分"""
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"当前文件大小: {len(content):,} chars")

# 找到 </head> 标签位置
head_end = content.find('</head>')
if head_end == -1:
    print("✗ 未找到 </head> 标签")
    sys.exit(1)

# 在 </head> 前插入干净的初始化代码
init_code = '''
  <!-- Clean DataStore and StateManager Implementation -->
  <script>
    // 1. DataStore 实现
    window.DataStore = {
      STORAGE_KEY: 'finance-tool',
      BACKUP_KEY: 'finance-tool-backup', 
      CACHE_PREFIX: 'cache_',
      
      load: function() {
        try {
          var s = localStorage.getItem(this.STORAGE_KEY);
          return s ? JSON.parse(s) : null;
        } catch(e) { return null; }
      },
      
      save: function(d) {
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(d));
          return true;
        } catch(e) { return false; }
      },
      
      getCache: function(date) {
        try {
          var k = this.CACHE_PREFIX + date;
          var c = localStorage.getItem(k);
          return c ? JSON.parse(c) : null;
        } catch(e) { return null; }
      },
      
      setCache: function(date, data) {
        try {
          localStorage.setItem(this.CACHE_PREFIX + date, JSON.stringify(data));
          return true;
        } catch(e) { return false; }
      },
      
      clear: function() {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.BACKUP_KEY);
      }
    };
    console.log('[Init] DataStore initialized');
    
    // 2. StateManager 实现
    window.StateManager = {
      state: { hasData: false, historyCount: 0, selectedCities: [], currentImportIndex: 0, currentMerchantType: 'all' },
      subscribers: new Map(),
      
      initialize: function(initialData) {
        console.log('[StateManager] initializing...');
        
        // 加载数据
        if (initialData && initialData.allMerchantData) {
          window.allMerchantData = initialData.allMerchantData;
        } else if (window.allMerchantData) {
          // 保持现有
        } else {
          var cached = DataStore.load();
          if (cached && cached.currentData) {
            window.allMerchantData = cached.currentData;
          }
        }
        
        // 设置导入历史
        if (initialData && initialData.importHistory) {
          window.importHistory = initialData.importHistory;
        } else if (!window.importHistory) {
          window.importHistory = [];
        }
        
        // 同步到全局
        if (!window.allMerchantData) window.allMerchantData = null;
        if (!window.importHistory) window.importHistory = [];
        
        // 更新状态
        this.state.hasData = !!window.allMerchantData;
        this.state.historyCount = window.importHistory ? window.importHistory.length : 0;
        
        console.log('[StateManager] initialized:', this.state);
      },
      
      subscribe: function(event, callback) {
        if (!this.subscribers.has(event)) {
          this.subscribers.set(event, []);
        }
        this.subscribers.get(event).push(callback);
      },
      
      notify: function(event, data) {
        var callbacks = this.subscribers.get(event) || [];
        callbacks.forEach(function(cb) {
          try { cb(data); } catch(e) { console.error('[StateManager] callback error:', e); }
        });
      },
      
      getState: function() {
        return this.state;
      },
      
      get: function(key) {
        return window[key];
      }
    };
    console.log('[StateManager] initialized');
  </script>
'''

# 替换 </head> 前的内容为新的初始化代码
# 找到 <head> 标签
head_start = content.find('<head>')
if head_start > 0:
    # 保留 DOCTYPE、html 标签，替换 head 内容
    doctype_end = content.find('>', content.find('<!DOCTYPE'))
    html_start = content.find('<html')
    html_end = content.find('>', html_start)
    
    # 构建新的头部
    new_head = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
''' + init_code + '''
</head>
'''
    
    # 找到 body 开始位置
    body_start = content.find('<body>')
    if body_start > 0:
        # 构建新文件
        new_content = new_head + content[body_start:]
        content = new_content
        print("✓ 已重建 HTML 头部，添加干净的 DataStore 和 StateManager 初始化")
    else:
        print("✗ 未找到 <body> 标签")
else:
    print("✗ 未找到 <head> 标签")

# 保存文件
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✓ 文件已保存，新大小: {len(content):,} chars")

# 验证
print("\n验证结果:")
checks = [
    ('无 IIFE 代码', '})();' not in content),
    ('有 window.DataStore', 'window.DataStore = {' in content),
    ('有 window.StateManager', 'window.StateManager = {' in content),
]

for name, result in checks:
    status = 'PASS' if result else 'FAIL'
    print(f"  [{status}] {name}")

print("\n执行: git add index-new.html && git commit -m 'fix: 重建HTML头部确保语法正确' && git push")
