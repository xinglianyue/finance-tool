with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'File size: {len(content)} chars')

# Find all script tags
import re
scripts = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
print(f'\nFound {len(scripts)} inline scripts')

# Check for DataStore references
datastore_refs = list(re.finditer(r'DataStore\.\w+', content))
print(f'\nFound {len(datastore_refs)} DataStore.method calls')
for m in datastore_refs[:10]:
    pos = m.start()
    start = max(0, pos - 30)
    end = min(len(content), pos + 50)
    print(f'  Position {pos}: ...{repr(content[start:end])}...')

# Check if window.DataStore is defined
window_datastore = list(re.finditer(r'window\.DataStore\s*=', content))
print(f'\nFound {len(window_datastore)} window.DataStore assignments')

# Check the loadFromCloud function
loadfromcloud_match = re.search(r'async function loadFromCloud\(\)[\s\S]{0,500}DataStore\.save', content)
if loadfromcloud_match:
    print('\n=== loadFromCloud function (first 500 chars after function) ===')
    print(loadfromcloud_match.group(0)[:500])
else:
    print('\nloadFromCloud with DataStore.save not found')

# Check data-store.js script tag location
script_tags = list(re.finditer(r'<script[^>]*src="js/data-store\.js"[^>]*>', content))
print(f'\nFound {len(script_tags)} data-store.js script tags')
for m in script_tags:
    pos = m.start()
    start = max(0, pos - 100)
    end = min(len(content), pos + 100)
    print(f'  Position {pos}: ...{repr(content[start:end])}...')
