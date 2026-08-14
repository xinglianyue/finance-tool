# -*- coding: utf-8 -*-
import urllib.request
import json
import base64
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    req = urllib.request.Request(
        'https://api.github.com/repos/xinglianyue/finance-tool/contents/js/data-store.js',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        content = base64.b64decode(data['content']).decode('utf-8')
        print(f"data-store.js length: {len(content)}")
        print("=== Content ===")
        print(content)
except Exception as e:
    print(f"Error: {e}")
