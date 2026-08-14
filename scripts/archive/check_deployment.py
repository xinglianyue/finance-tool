# -*- coding: utf-8 -*-
import urllib.request
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 60)
print("GitHub Pages 部署验证")
print("=" * 60)

# 1. 检查 data-store.js 内容
print("\n[1] 检查 js/data-store.js:")
try:
    req = urllib.request.Request(
        'https://xinglianyue.github.io/finance-tool/js/data-store.js',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        content = resp.read().decode('utf-8')
        print(f"   HTTP: {resp.status}")
        print(f"   Size: {len(content)} bytes")
        
        if 'class DataStore' in content:
            print("   ✓ Has DataStore class")
        else:
            print("   ✗ Missing DataStore class")
            
        if 'window.DataStore = new DataStore()' in content:
            print("   ✓ Exports window.DataStore")
        else:
            print("   ✗ Missing window.DataStore export")
            
        if 'save(data)' in content:
            print("   ✓ Has save method")
        else:
            print("   ✗ Missing save method")
except Exception as e:
    print(f"   Error: {e}")

# 2. 检查 index-new.html 版本
print("\n[2] 检查 index-new.html 版本:")
try:
    req = urllib.request.Request(
        'https://xinglianyue.github.io/finance-tool/index-new.html',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        content = resp.read().decode('utf-8')
        print(f"   HTTP: {resp.status}")
        
        import re
        version_match = re.search(r"var APP_VERSION = '(\d+)';", content)
        if version_match:
            print(f"   Version: {version_match.group(1)}")
        else:
            print("   Version: Not found")
            
        if 'js/data-store.js?v=' in content:
            cache_match = re.search(r'js/data-store.js\?v=(\d+)', content)
            if cache_match:
                print(f"   Cache version: {cache_match.group(1)}")
        else:
            print("   ✗ data-store.js not referenced")
            
except Exception as e:
    print(f"   Error: {e}")

print("\n" + "=" * 60)
print("请在新窗口访问测试：")
print("https://xinglianyue.github.io/finance-tool/index-new.html")
print("=" * 60)
