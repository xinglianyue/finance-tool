# -*- coding: utf-8 -*-
"""检查GitHub Pages实际部署的内容"""
import urllib.request
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 60)
print("检查 GitHub Pages 部署内容")
print("=" * 60)

try:
    req = urllib.request.Request(
        'https://xinglianyue.github.io/finance-tool/index-new.html',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        raw = resp.read()
        print(f"\nHTTP Status: {resp.status}")
        print(f"Content-Length: {len(raw)} bytes")
        print(f"Content-Type: {resp.headers.get('Content-Type')}")
        
        # 检查UTF-8编码
        try:
            content = raw.decode('utf-8')
            print("\n✓ 文件可以正确解码为UTF-8")
            
            # 检查标题
            idx = content.find('<title>')
            if idx >= 0:
                end = content.find('</title>', idx)
                title = content[idx:end+8]
                print(f"\n标题: {title}")
                
                # 检查是否有乱码
                if '\ufffd' in title or '?' in title.replace('?', ''):
                    print("⚠ 标题可能有乱码")
                else:
                    print("✓ 标题正常")
            
            # 检查版本
            import re
            version_match = re.search(r"var APP_VERSION = '(\d+)';", content)
            if version_match:
                print(f"\nAPP_VERSION: {version_match.group(1)}")
            
            # 检查script标签
            script_match = re.search(r'<script src="js/data-store\.js\?v=(\d+)"', content)
            if script_match:
                print(f"JS cache version: {script_match.group(1)}")
                
        except UnicodeDecodeError as e:
            print(f"\n✗ UTF-8解码失败: {e}")
            # 尝试其他编码
            for enc in ['gbk', 'gb2312', 'latin-1']:
                try:
                    test = raw.decode(enc)
                    print(f"  使用 {enc} 编码可读")
                    break
                except:
                    pass
                
except Exception as e:
    print(f"错误: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
