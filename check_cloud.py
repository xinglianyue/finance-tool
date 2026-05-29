import urllib.request
import json

try:
    url = "https://raw.githubusercontent.com/xinglianyue/finance-tool/main/shared-data.json"
    response = urllib.request.urlopen(url)
    data = json.load(response)
    
    print('云端记录数:', len(data))
    for i, record in enumerate(data):
        print(f'记录{i+1}: 日期={record["date"]}, 文件名={record.get("fileName", "未知")}')
except Exception as e:
    print('错误:', e)