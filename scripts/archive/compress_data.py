# 压缩 shared-data.json - 保留所有 18 条记录
import json
import os

file_path = r'C:\Users\xinxi\Desktop\财务工具\shared-data.json'

# 读取数据
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"原始记录数: {len(data)}")
print(f"原始大小: {os.path.getsize(file_path) / 1024 / 1024:.2f} MB")

# 移除不必要的字段，保持数据结构一致
new_data = []
for record in data:
    new_record = {
        'date': record.get('date'),
        'merchantData': record.get('merchantData', {}),
        'version': record.get('version', 1),
        'isLatest': record.get('isLatest', False)
    }
    new_data.append(new_record)

# 保存
output_path = file_path
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(new_data, f, ensure_ascii=False, indent=2)

# 获取文件大小
file_size = os.path.getsize(output_path)
print(f"压缩后大小: {file_size / 1024:.2f} KB")
print(f"压缩率: {(1 - file_size / 5158875) * 100:.1f}%")
print(f"最终记录数: {len(new_data)}")
