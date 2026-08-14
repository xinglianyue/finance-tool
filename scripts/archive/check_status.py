# -*- coding: utf-8 -*-
"""Check deployment status"""
import urllib.request
import json
import sys
import io
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 60)
print("Deployment Status Check")
print("=" * 60)

# Check GitHub API for latest run
try:
    req = urllib.request.Request(
        'https://api.github.com/repos/xinglianyue/finance-tool/actions/runs?per_page=1',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode())
        run = data['workflow_runs'][0]
        print(f"\nLatest GitHub Actions Run:")
        print(f"  ID: {run['id']}")
        print(f"  Status: {run['status']}")
        print(f"  Conclusion: {run['conclusion']}")
        print(f"  SHA: {run['head_sha'][:8]}")
except Exception as e:
    print(f"Error checking GitHub Actions: {e}")

# Check local file
path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

v = re.search(r"APP_VERSION = '(\d+)'", content)
if v:
    print(f"\nLocal APP_VERSION: {v.group(1)}")

print(f"\nLocal file size: {len(content)} chars")

print("\n" + "=" * 60)
print("URL: https://xinglianyue.github.io/finance-tool/index-new.html")
print("=" * 60)
