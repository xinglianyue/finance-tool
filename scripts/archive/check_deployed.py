# -*- coding: utf-8 -*-
"""检查GitHub Pages部署的内容"""
import urllib.request
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 60)
print("检查GitHub Pages实际部署内容")
print("=" * 60)

try:
    req = urllib.request.Request(
        'https://xinglianyue.github.io/finance-tool/index-new.html',
        headers={'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache'}
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read()
        print(f"\nHTTP Status: {resp.status}")
        print(f"Content-Length: {len(raw)} bytes")
        print(f"Content-Type: {resp.headers.get('Content-Type')}")
        
        # Try to decode as UTF-8
        try:
            content = raw.decode('utf-8')
            print("\n✓ File decoded successfully as UTF-8")
            
            # Find title
            title_start = content.find('<title>')
            if title_start >= 0:
                title_end = content.find('</title>', title_start)
                title = content[title_start:title_end+8]
                print(f"\nTitle: {title}")
                
            # Check for script tags
            import re
            scripts = re.findall(r'<script src="([^"]+)">', content)
            print(f"\nScript tags found:")
            for s in scripts[:5]:
                print(f"  {s}")
                
            # Check for DataStore
            datastore_refs = content.count('DataStore')
            print(f"\nDataStore references: {datastore_refs}")
            
            # Check for version
            versions = re.findall(r"APP_VERSION = '(\d+)'", content)
            if versions:
                print(f"\nAPP_VERSION values: {set(versions)}")
                
        except UnicodeDecodeError as e:
            print(f"\n✗ UTF-8 decode error: {e}")
            print("Trying different encoding...")
            
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
