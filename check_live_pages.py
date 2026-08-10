# -*- coding: utf-8 -*-
"""检查GitHub Pages实际部署的内容"""
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
            'Cache-Control': 'no-cache'
        }
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read()
        print(f"\nHTTP Status: {resp.status}")
        print(f"Content-Length: {len(raw)} bytes")
        
        # 尝试多种编码
        for enc in ['utf-8', 'gbk', 'latin-1']:
            try:
                content = raw.decode(enc)
                # 检查是否有中文字符
                if '财务' in content or 'title' in content.lower():
                    print(f"\n✓ Decoded with {enc}")
                    
                    # 检查版本号
                    v = re.search(r"APP_VERSION = '(\d+)'", content)
                    if v:
                        print(f"  APP_VERSION: {v.group(1)}")
                    
                    # 检查DataStore
                    if 'window.DataStore' in content:
                        print(f"  Has DataStore: YES")
                    else:
                        print(f"  Has DataStore: NO")
                    
                    # 检查中文
                    if '财务分析工具' in content:
                        print(f"  Chinese title: CORRECT")
                    else:
                        print(f"  Chinese title: MISSING or WRONG")
                    
                    break
            except:
                continue
                
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
