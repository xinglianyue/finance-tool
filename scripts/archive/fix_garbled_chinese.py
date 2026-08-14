# -*- coding: utf-8 -*-
"""修复GBK被误读为UTF-8导致的乱码问题"""
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

# 读取文件
with open(path, "rb") as f:
    raw = f.read()

print(f"Original file size: {len(raw)} bytes")

# 尝试解码 - 先假设是UTF-8，看有多少替换字符
try:
    content = raw.decode('utf-8')
    print("✓ File is valid UTF-8")
except UnicodeDecodeError:
    print("✗ File has invalid UTF-8 sequences")
    content = raw.decode('utf-8', errors='replace')

# 统计乱码模式
garbled_count = content.count('鐗') + content.count('鏁') + content.count('鎵')
print(f"Garbled Chinese patterns found: {garbled_count}")

# 定义要修复的映射（GBK编码被误读为UTF-8的典型情况）
# 这些是从控制台输出中观察到的实际乱码
replacements = [
    # 常见短语
    ('鐗堟湰鍙樻洿', '版本变更'),
    ('锛屽己鍒跺埛鏂板姞杞芥渶鏂拌祫婧?', '，强制刷新加载最新资源'),
    ('鏁版嵁宸蹭繚瀛?', '数据已保存'),
    ('鏁版嵁鍔犺浇澶辫触', '数据加载失败'),
    ('妫€娴?', '检测'),
    ('鐗堟湰涓?鐗?', '版本一致'),
    
    # 城市名称
    ('鎵垮痉甯?', '承德市'),
    ('鎵垮痉', '承德'),
    ('鍥村満婊℃棌钂欏彜鏃忚嚜娌诲幙', '围场满族蒙古族自治县'),
    ('鍥村満鍘?', '围场县'),
    ('搴蜂繚鍘?', '康保县'),
    ('鐜夌敯鍘?', '玉田县'),
    ('娌冲寳鐪?', '河北省'),
    ('娌у窞甯?', '沧州市'),
    ('閭搁偅甯?', '廊坊市'),
    ('绉︾殗宀涘競', '秦皇岛市'),
    ('淇濆畾甯?', '保定市'),
    ('琛℃按甯?', '衡水市'),
    ('寮€鍖栧尯', '开平区'),
    ('涓夋渤甯?', '三河市'),
    
    # 其他常见词
    ('鍔犺浇', '加载'),
    ('鏁版嵁', '数据'),
    ('鍒嗘瀽', '分析'),
    ('鍒嗘瀽宸ュ叿', '分析工具'),
    ('缇庡洟', '美团'),
    ('浠ｇ悊鍟?', '代理商'),
    ('涓撶敤', '专用'),
    ('璐㈠姟', '财务'),
]

fixed_count = 0
for bad, good in replacements:
    count = content.count(bad)
    if count > 0:
        content = content.replace(bad, good)
        fixed_count += count
        print(f"Fixed: '{bad}' -> '{good}' ({count} times)")

# 重新写入
with open(path, "wb") as f:
    f.write(content.encode('utf-8'))

print(f"\nTotal fixes: {fixed_count}")

# 验证
with open(path, "r", encoding='utf-8', errors='replace') as f:
    verify = f.read()
    
remaining = verify.count('鐗') + verify.count('鏁') + verify.count('鎵')
if remaining == 0:
    print("✓ All garbled text fixed!")
else:
    print(f"⚠ Remaining garbled patterns: {remaining}")

print("\nRun: git add index-new.html && git commit -m 'fix: 修复中文乱码' && git push")
