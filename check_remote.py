# -*- coding: utf-8 -*-
import urllib.request
import urllib.error
import json
import sys
import io

# Force UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    req = urllib.request.Request(
        'https://api.github.com/repos/xinglianyue/finance-tool/contents/index-new.html',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        content = data['content']
        import base64
        decoded = base64.b64decode(content).decode('utf-8')
        lines = decoded.split('\n')
        print(f"GitHub API response: {len(decoded)} chars")
        print("=== First 30 lines ===")
        for i, line in enumerate(lines[:30]):
            print(f"{i+1}: {line}")
        print("\n=== Version check ===")
        for i, line in enumerate(lines):
            if 'APP_VERSION' in line:
                print(f"Line {i+1}: {line.strip()}")
            if 'data-store.js' in line or 'state-manager.js' in line:
                print(f"Line {i+1}: {line.strip()}")
        print("\n=== DataStore.save check (around line 2926) ===")
        for i, line in enumerate(lines[2920:2930], start=2921):
            print(f"{i}: {line}")
except Exception as e:
    print(f"Error: {e}")
