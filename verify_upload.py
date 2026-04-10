#!/usr/bin/env python3
"""
上传前验证脚本 - 确保文件完整性
使用: python verify_upload.py
"""

import os
import sys

def verify_file(filepath):
    """验证HTML文件是否完整"""
    print(f"验证文件: {filepath}")
    
    # 1. 检查文件存在
    if not os.path.exists(filepath):
        print("[X] 文件不存在!")
        return False
    
    # 2. 检查文件大小
    size = os.path.getsize(filepath)
    print(f"  文件大小: {size} 字节")
    if size < 10000:  # 正常应该 > 10KB
        print(f"  [!] 文件过小，可能已损坏!")
        return False
    
    # 3. 检查编码和结尾
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        print("[X] 文件编码错误，不是有效的UTF-8!")
        return False
    
    # 4. 检查关键标签
    checks = [
        ('<!DOCTYPE html>', 'HTML声明'),
        ('<html', 'html标签'),
        ('</html>', 'html结束标签'),
        ('<script>', 'script标签'),
        ('</script>', 'script结束标签'),
    ]
    
    for tag, name in checks:
        if tag not in content:
            print(f"[X] {name}: {tag} MISSING")
            return False
        print(f"  [OK] {name}")
    
    # 5. 检查文件结尾
    stripped = content.strip()
    if not stripped.endswith('</html>'):
        print("[X] 文件未以</html>结尾，可能不完整!")
        return False
    print("  [OK] 文件以</html>结尾")
    
    # 6. 检查括号平衡
    round_open = content.count('(')
    round_close = content.count(')')
    curly_open = content.count('{')
    curly_close = content.count('}')
    
    if round_open != round_close:
        print(f"[X] 圆括号不平衡: {round_open} vs {round_close}")
        return False
    print(f"  [OK] 圆括号平衡: {round_open}")
    
    if curly_open != curly_close:
        print(f"[X] 花括号不平衡: {curly_open} vs {curly_close}")
        return False
    print(f"  [OK] 花括号平衡: {curly_open}")
    
    print("\n[OK] 文件验证通过，可以上传!")
    return True

if __name__ == '__main__':
    filepath = os.path.join(os.path.dirname(__file__), 'index.html')
    if verify_file(filepath):
        sys.exit(0)
    else:
        print("\n[X] 验证失败，请修复后再上传!")
        sys.exit(1)
