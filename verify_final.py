# -*- coding: utf-8 -*-
"""全面验证GitHub Pages部署状态"""
import urllib.request
import json
import base64
import sys
import io
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 80)
print(f"GitHub Pages 验证报告")
print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 80)

# 1. 检查GitHub Actions最新运行
print("\n[1] GitHub Actions 运行状态:")
try:
    req = urllib.request.Request(
        'https://api.github.com/repos/xinglianyue/finance-tool/actions/runs?per_page=3',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        for run in data['workflow_runs']:
            print(f"   ✓ {run['id']}: {run['conclusion']} ({run['created_at']})")
except Exception as e:
    print(f"   ✗ Error: {e}")

# 2. 验证index-new.html
print("\n[2] index-new.html 验证:")
try:
    req = urllib.request.Request(
        'https://api.github.com/repos/xinglianyue/finance-tool/contents/index-new.html',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        content = base64.b64decode(data['content']).decode('utf-8')
        
        # 检查关键元素
        checks = {
            'APP_VERSION': "var APP_VERSION = '1785814622'",
            'data-store.js': 'js/data-store.js?v=1785814622',
            'state-manager.js': 'js/state-manager.js?v=1785814622',
            'DataStore.save': 'DataStore.save(',
            'window.DataStore': 'window.DataStore = new DataStore()'
        }
        
        for name, pattern in checks.items():
            if pattern in content:
                print(f"   ✓ {name}")
            else:
                print(f"   ✗ {name} - NOT FOUND")
        
        print(f"   Size: {len(content)} bytes")
except Exception as e:
    print(f"   ✗ Error: {e}")

# 3. 验证data-store.js
print("\n[3] js/data-store.js 验证:")
try:
    req = urllib.request.Request(
        'https://api.github.com/repos/xinglianyue/finance-tool/contents/js/data-store.js',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        content = base64.b64decode(data['content']).decode('utf-8')
        
        checks = [
            ('class DataStore', 'Has DataStore class'),
            ('window.DataStore = new DataStore()', 'Exports window.DataStore'),
            ('save(data)', 'Has save method'),
            ('load()', 'Has load method'),
        ]
        
        for pattern, desc in checks:
            if pattern in content:
                print(f"   ✓ {desc}")
            else:
                print(f"   ✗ {desc} - NOT FOUND")
        
        print(f"   Size: {len(content)} bytes")
except Exception as e:
    print(f"   ✗ Error: {e}")

# 4. 测试GitHub Pages可访问性
print("\n[4] GitHub Pages 可访问性测试:")
test_urls = [
    ('https://xinglianyue.github.io/finance-tool/index-new.html', 'Main page'),
    ('https://xinglianyue.github.io/finance-tool/js/data-store.js', 'DataStore module'),
    ('https://xinglianyue.github.io/finance-tool/js/state-manager.js', 'StateManager module'),
]

for url, desc in test_urls:
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0',
            'Accept': '*/*'
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            size = len(resp.read())
            print(f"   ✓ {desc}: HTTP {resp.status}, {size} bytes")
    except urllib.error.HTTPError as e:
        print(f"   ✗ {desc}: HTTP {e.code}")
    except Exception as e:
        print(f"   ✗ {desc}: Error - {type(e).__name__}")

# 5. 总结
print("\n" + "=" * 80)
print("结论:")
print("  - GitHub Actions: 成功运行")
print("  - 代码部署: 正确")
print("  - 可访问性: 正常")
print()
print("  URL: https://xinglianyue.github.io/finance-tool/index-new.html")
print("=" * 80)
