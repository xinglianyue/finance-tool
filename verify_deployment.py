# -*- coding: utf-8 -*-
import urllib.request
import urllib.error
import json
import base64
import sys
import io
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 80)
print("GitHub Pages 部署验证")
print("=" * 80)

# Check GitHub Pages status
try:
    req = urllib.request.Request(
        'https://api.github.com/repos/xinglianyue/finance-tool/pages',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        print(f"\nGitHub Pages Status: {data.get('status', 'unknown')}")
        print(f"URL: {data.get('url', 'N/A')}")
        print(f"Build Status: {data.get('build_status', 'N/A')}")
except Exception as e:
    print(f"\nPages API Error: {e}")

# Check Actions workflow run
try:
    req = urllib.request.Request(
        'https://api.github.com/repos/xinglianyue/finance-tool/actions/runs?per_page=1',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        if data.get('workflow_runs'):
            run = data['workflow_runs'][0]
            print(f"\nLatest Workflow Run:")
            print(f"  ID: {run['id']}")
            print(f"  Status: {run['status']}")
            print(f"  Conclusion: {run['conclusion']}")
            print(f"  Created: {run['created_at']}")
except Exception as e:
    print(f"Actions API Error: {e}")

# Verify files on GitHub
files_to_check = [
    ('index-new.html', 229310),
    ('js/data-store.js', 3901),
    ('js/state-manager.js', None)
]

print("\n" + "=" * 80)
print("文件验证")
print("=" * 80)

for filename, expected_size in files_to_check:
    try:
        req = urllib.request.Request(
            f'https://api.github.com/repos/xinglianyue/finance-tool/contents/{filename}',
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            content = base64.b64decode(data['content']).decode('utf-8')
            actual_size = len(content)
            size_match = "✓" if (expected_size and actual_size == expected_size) else "?"
            print(f"\n{filename}:")
            print(f"  Size: {actual_size} bytes {size_match}")
            if filename == 'index-new.html':
                # Check version
                lines = content.split('\n')
                for line in lines[:30]:
                    if 'APP_VERSION' in line:
                        print(f"  Version: {line.strip()}")
                        break
    except Exception as e:
        print(f"\n{filename}: ERROR - {e}")

# Test actual page loading
print("\n" + "=" * 80)
print("页面加载测试")
print("=" * 80)

test_urls = [
    ('https://xinglianyue.github.io/finance-tool/index-new.html', 'Main page'),
    ('https://xinglianyue.github.io/finance-tool/js/data-store.js', 'DataStore'),
]

for url, desc in test_urls:
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'text/html,application/json,*/*'
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read()
            print(f"\n{desc}:")
            print(f"  URL: {url}")
            print(f"  Status: {resp.status}")
            print(f"  Size: {len(content)} bytes")
            if b'DataStore' in content or b'window.DataStore' in content:
                print(f"  ✓ Contains DataStore code")
    except urllib.error.HTTPError as e:
        print(f"\n{desc}: HTTP {e.code} - {e.reason}")
    except Exception as e:
        print(f"\n{desc}: ERROR - {e}")

print("\n" + "=" * 80)
print("完成")
print("=" * 80)
