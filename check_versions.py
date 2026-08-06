# -*- coding: utf-8 -*-
import urllib.request
import json
import base64

print("=== Checking GitHub Repository ===")
try:
    req = urllib.request.Request(
        'https://api.github.com/repos/xinglianyue/finance-tool/contents/index-new.html',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        content = base64.b64decode(data['content']).decode('utf-8')
        
        import re
        version_match = re.search(r"var APP_VERSION = '(\d+)';", content)
        if version_match:
            print(f"GitHub index-new.html version: {version_match.group(1)}")
        
        cache_match = re.search(r'js/data-store.js\?v=(\d+)', content)
        if cache_match:
            print(f"JS cache version: {cache_match.group(1)}")
except Exception as e:
    print(f"Error: {e}")

print("\n=== Checking GitHub Pages ===")
try:
    req = urllib.request.Request(
        'https://xinglianyue.github.io/finance-tool/index-new.html',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        content = resp.read().decode('utf-8')
        import re
        version_match = re.search(r"var APP_VERSION = '(\d+)';", content)
        if version_match:
            print(f"GitHub Pages version: {version_match.group(1)}")
except Exception as e:
    print(f"Error: {e}")
