# -*- coding: utf-8 -*-
"""Check what GitHub Pages actually serves"""
import urllib.request
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    req = urllib.request.Request(
        'https://xinglianyue.github.io/finance-tool/index-new.html',
        headers={'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache'}
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read()
        print(f"HTTP: {resp.status}")
        print(f"Size: {len(raw)} bytes")

        # Try UTF-8 first
        try:
            content = raw.decode('utf-8')
            title_start = content.find('<title>')
            if title_start >= 0:
                title_end = content.find('</title>', title_start) + 8
                title = content[title_start:title_end]
                print(f"Title (UTF-8): {title}")

                if '财务分析工具' in title and '美团代理商专用' in title:
                    print("✓ Chinese text is CORRECT on GitHub Pages")
                else:
                    print("✗ Chinese text is WRONG on GitHub Pages")
                    print(f"  Title bytes: {title.encode('utf-8', errors='replace').hex()}")
        except UnicodeDecodeError:
            print("✗ Not valid UTF-8")

except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
