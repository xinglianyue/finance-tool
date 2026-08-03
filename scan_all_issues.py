with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')

# Search for ALL potential broken regex patterns
print('\n=== Checking for all broken regex patterns ===')
issues = []
for i, line in enumerate(lines):
    if '.replace(/' in line:
        # Check if line ends abruptly (doesn't end with /g or closing parenthesis)
        stripped = line.rstrip()
        if not stripped.endswith('/g') and not stripped.endswith('/i') and not stripped.endswith('/m'):
            # Check if next line starts with regex flags
            if i + 1 < len(lines):
                next_line = lines[i + 1].lstrip()
                if next_line.startswith('/g') or next_line.startswith('/i') or next_line.startswith('/m') or next_line.startswith('/gi') or next_line.startswith('/igm'):
                    issues.append((i+1, i+2, line.rstrip()[:60], next_line[:60]))

if issues:
    print(f'Found {len(issues)} broken regex patterns:')
    for line1, line2, content1, content2 in issues:
        print(f'\nLines {line1}-{line2}:')
        print(f'  {line1}: {repr(content1)}')
        print(f'  {line2}: {repr(content2)}')
else:
    print('No broken regex patterns found - all good!')

# Also check for broken string patterns like .join(' split across lines
print('\n=== Checking for broken string patterns ===')
string_issues = []
for i, line in enumerate(lines):
    if ".join('" in line and line.rstrip().endswith("join('"):
        if i + 1 < len(lines):
            next_line = lines[i + 1].lstrip()
            if next_line.startswith("');") or next_line.startswith("');\n"):
                string_issues.append((i+1, i+2, line.rstrip()[:60], next_line[:60]))

if string_issues:
    print(f'Found {len(string_issues)} broken string patterns:')
    for line1, line2, content1, content2 in string_issues:
        print(f'\nLines {line1}-{line2}:')
        print(f'  {line1}: {repr(content1)}')
        print(f'  {line2}: {repr(content2)}')
else:
    print('No broken string patterns found!')

print('\n=== Analysis complete ===')