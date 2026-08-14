with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

print('Original size:', len(content))

# Find all script references
import re
scripts = list(re.finditer(r'<script[^>]*src="([^"]*)"[^>]*>', content))
print(f'\nFound {len(scripts)} script tags:')

for i, m in enumerate(scripts):
    src = m.group(1)
    pos = m.start()
    print(f'{i+1}. Position {pos}: {src}')

# Check for duplicates
js_files = [m.group(1) for m in scripts]
duplicates = {}
for js in js_files:
    if js in duplicates:
        duplicates[js].append(js)
    else:
        duplicates[js] = [js]

print('\nChecking for duplicates...')
for js, count in duplicates.items():
    if len(count) > 1:
        print(f'  DUPLICATE: {js} appears {len(count)} times')

# Remove duplicate references (keep the first one)
lines = content.split('\n')
new_lines = []
seen_scripts = set()
removed_count = 0

for line in lines:
    # Check if this line has a script tag
    script_match = re.search(r'<script[^>]*src="([^"]*)"[^>]*>', line)
    if script_match:
        src = script_match.group(1)
        # Extract just the filename (without version query)
        base_src = src.split('?')[0]
        
        if base_src in seen_scripts:
            print(f'Removing duplicate: {src}')
            removed_count += 1
            continue  # Skip this line
        
        seen_scripts.add(base_src)
    
    new_lines.append(line)

new_content = '\n'.join(new_lines)
print(f'\nRemoved {removed_count} duplicate script(s)')
print('New size:', len(new_content))

# Write back
with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('File updated successfully!')

# Verify
print('\n=== Verification ===')
final_scripts = list(re.finditer(r'<script[^>]*src="([^"]*)"[^>]*>', new_content))
print(f'Final script count: {len(final_scripts)}')
for m in final_scripts:
    print(f'  - {m.group(1)}')