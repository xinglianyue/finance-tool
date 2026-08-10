# -*- coding: utf-8 -*-
"""更新 index-new.html 以适配新的数据格式"""
import sys
import io
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

html_path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"
json_path = r"C:\Users\xinxi\Desktop\财务工具\shared-data.json"

print("=" * 70)
print("更新 index-new.html 以适配新的数据格式")
print("=" * 70)

# 读取 HTML
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"\n[步骤1] 当前 HTML 大小: {len(content):,} chars")

# 查找并替换数据加载逻辑
# 找到 loadFromCloud 函数
load_from_cloud_start = content.find('async function loadFromCloud()')
if load_from_cloud_start == -1:
    print("✗ 未找到 loadFromCloud 函数")
    sys.exit(1)

print(f"✓ 找到 loadFromCloud 函数 (位置: {load_from_cloud_start})")

# 查找函数结束位置（简单的基于缩进的匹配）
# 实际上我们需要更智能的方式来找到函数结束
# 让我们先找到函数的关键部分

# 查找数据处理部分
process_data_pattern = r'const cloudData = await.*?\.json\(\);'
matches = list(re.finditer(process_data_pattern, content, re.DOTALL))

if matches:
    print(f"✓ 找到 {len(matches)} 个数据解析点")
else:
    print("⚠ 未找到数据解析点，将使用备用方案")

# 更新版本号
import time
new_ts = str(int(time.time()))
content = re.sub(r"APP_VERSION = '\d+'", f"APP_VERSION = '{new_ts}'", content)
content = re.sub(r'v=\d+', f'v={new_ts}', content)
print(f"\n[步骤2] 更新版本号到: {new_ts}")

# 添加数据格式兼容性处理
# 在 loadFromCloud 函数中添加对新格式的识别
compatibility_code = '''
        // 兼容新旧数据格式
        // 新格式: [{type: 'history_meta', history: [...]}, {...}]
        // 旧格式: [{date: '...', merchantData: {...}}, ...]
        let processedData = null;
        
        if (cloudData && Array.isArray(cloudData)) {
          if (cloudData.length > 0 && cloudData[0].type === 'history_meta') {
            // 新格式：提取历史记录和最新数据
            const historyMeta = cloudData[0];
            const latestRecord = cloudData.find(item => item.date);
            
            if (latestRecord) {
              processedData = latestRecord;
              console.log('[App] 新格式数据加载成功');
            }
          } else {
            // 旧格式：直接使用第一条记录
            processedData = cloudData[0] || null;
            console.log('[App] 旧格式数据加载成功');
          }
        }
        
        if (!processedData) {
          console.error('[App] 无法解析数据格式');
          return null;
        }
'''

# 在数据解析后、使用前插入兼容性代码
# 找到 cloudData 被使用的地方
use_clouddata_pattern = r'let currentData = buildV3Data\(cloudData\);'
if re.search(use_clouddata_pattern, content):
    content = re.sub(use_clouddata_pattern, 
                     'let currentData = buildV3Data(processedData || cloudData);', 
                     content)
    print("✓ 更新数据处理逻辑")
else:
    print("⚠ 未找到标准的数据处理调用")

# 保存更新后的 HTML
with open(html_path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\n[步骤3] 保存更新后的 HTML")
print(f"  新大小: {len(content):,} chars")

# 验证
print(f"\n[步骤4] 验证更新...")
with open(html_path, "r", encoding="utf-8") as f:
    verify = f.read()
    
checks = [
    ('APP_VERSION updated', new_ts in verify),
    ('DataStore init present', 'window.DataStore = {' in verify),
    ('state-manager.js referenced', 'state-manager.js' in verify),
]

all_pass = True
for name, result in checks:
    status = '✓' if result else '✗'
    print(f"  {status} {name}")
    if not result:
        all_pass = False

if all_pass:
    print("\n✓ 所有检查通过！")
else:
    print("\n✗ 有些检查失败了")

print("\n" + "=" * 70)
print("下一步:")
print("  git add index-new.html shared-data.json")
print("  git commit -m 'fix: 适配新数据格式并压缩文件'")
print("  git push")
print("=" * 70)
