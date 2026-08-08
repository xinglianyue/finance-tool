# -*- coding: utf-8 -*-
import urllib.request
import re
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'zh-CN,zh;q=0.9'
        }
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read()
        print(f"\nHTTP Status: {resp.status}")
        print(f"Content-Length: {len(raw)} bytes")
        
        # Try UTF-8 first
        try:
            content = raw.decode('utf-8')
            print("\n✓ Decoded as UTF-8")
            
            # Find title
            title_match = re.search(r'<title>(.*?)</title>', content)
            if title_match:
                title = title_match.group(1)
                print(f"\nTitle: {title}")
                
                # Check if title is correct Chinese
                if '财务分析工具' in title and '美团代理商专用' in title:
                    print("✓ Title is CORRECT!")
                else:
                    print(f"⚠ Title might have issues: {repr(title[:50])}")
            else:
                print("✗ No <title> tag found")
            
            # Check version
            version_match = re.search(r"var APP_VERSION = '(\d+)';", content)
            if version_match:
                print(f"\nAPP_VERSION: {version_match.group(1)}")
                
            # Check for replacement characters
            if '\ufffd' in content:
                count = content.count('\ufffd')
                print(f"\n⚠ Found {count} replacement characters (encoding error)")
            else:
                print("\n✓ No replacement characters found")
                
        except UnicodeDecodeError as e:
            print(f"\n✗ UTF-8 decode failed: {e}")
            
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
