# -*- coding: utf-8 -*-
import urllib.request
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 60)
print("GitHub Pages 内容检查")
print("=" * 60)

try:
    req = urllib.request.Request(
        'https://xinglianyue.github.io/finance-tool/index-new.html',
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read()
        print(f"\nHTTP Status: {resp.status}")
        print(f"Content-Length: {len(raw)} bytes")
        print(f"Content-Type: {resp.headers.get('Content-Type')}")
        
        # 尝试多种编码
        for enc in ['utf-8', 'gbk', 'gb2312', 'latin-1']:
            try:
                content = raw.decode(enc)
                idx = content.find('<title>')
                if idx >= 0:
                    end = content.find('</title>', idx)
                    title = content[idx:end+8]
                    print(f"\n使用 {enc} 编码:")
                    print(f"  Title: {title}")
                    break
            except Exception as e:
                pass
        
        # 直接检查字节
        print(f"\n原始字节 (前100): {raw[:100]}")
        
        # 查找title标签
        title_start = raw.find(b'<title>')
        if title_start >= 0:
            title_end = raw.find(b'</title>', title_start)
            title_bytes = raw[title_start:title_end+8]
            print(f"\n原始标题字节: {title_bytes}")
            
except Exception as e:
    print(f"错误: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
