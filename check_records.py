import json

with open(r'C:\Users\xinxi\Desktop\财务工具\shared-data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

print(f'Total records: {len(d)}')
print()
for i, rec in enumerate(d):
    date = rec.get('date', 'N/A')
    is_latest = rec.get('isLatest', False)
    merchant_data = rec.get('merchantData', {})
    
    # Check all merchants
    all_merchants = merchant_data.get('all', {})
    ka_merchants = merchant_data.get('ka', {})
    
    print(f'[{i}] {date} (latest={is_latest})')
    print(f'     All count: {len(all_merchants)}, KA count: {len(ka_merchants)}')
    
    # Check for 7-18 data
    if date == '2026-07-18':
        print('     ^^^ This is the latest record!')
        
print()
print('First record:', d[0].get('date'))
print('Last record:', d[-1].get('date'))
