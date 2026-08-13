import difflib

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    local = f.readlines()

with open(r'C:\Users\xinxi\Desktop\财务工具\remote_index.html', 'r', encoding='utf-8') as f:
    remote = f.readlines()

print(f'Local lines: {len(local)}')
print(f'Remote lines: {len(remote)}')
print()

# Find differences
diff = list(difflib.unified_diff(local, remote, fromfile='local', tofile='remote', lineterm=''))
if diff:
    print('Differences found:')
    for line in diff[:100]:  # Show first 100 lines of diff
        print(line)
else:
    print('No differences!')
