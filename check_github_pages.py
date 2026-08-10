# -*- coding: utf-8 -*-
"""检查GitHub Pages部署内容"""
import urllib.request
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 60)
print("GitHub Pages Live Check")
print("=" * 60)

try:
    req = urllib.request.Request(
        'https://xinglianyue.github.io/finance-tool/index-new.html',
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Cache-Control': 'no-cache'
        }
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read()
        print(f"\nHTTP Status: {resp.status}")
        print(f"Content-Length: {len(raw)} bytes")
        
        # Try to decode as UTF-8
        try:
            content = raw.decode('utf-8')
            print("\n✓ Decoded successfully as UTF-8")
            
            # Check title
            title_start = content.find('<title>')
            if title_start >= 0:
                title_end = content.find('</title>', title_start) + 8
                title = content[title_start:title_end]
                print(f"\nTitle: {title}")
                
                # Check if title has Chinese
                if '财务分析工具' in title:
                    print("✓ Title contains correct Chinese text")
                else:
                    print("⚠ Title may have encoding issues")
                    print(f"  Raw title bytes: {title.encode('utf-8', errors='replace').hex()}")
            
            # Check version
            import re
            v = re.search(r"APP_VERSION = '(\d+)'", content)
            if v:
                print(f"\nAPP_VERSION: {v.group(1)}")
            
            # Check DataStore fallback
            if 'window.DataStore = {' in content or 'DataStore fallback' in content:
                print("✓ Has DataStore fallback script")
            else:
                print("✗ Missing DataStore fallback script")
                
        except UnicodeDecodeError as e:
            print(f"\n✗ UTF-8 decode error: {e}")
            
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
