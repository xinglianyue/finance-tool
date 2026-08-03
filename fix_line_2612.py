with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')

# Find and fix the broken regex at lines 2612-2613
fixed_lines = []
i = 0
fixes_applied = 0

while i < len(lines):
    line = lines[i]
    
    # Check for the specific broken pattern
    if i == 2611 and '.replace(/' in line and not line.rstrip().endswith('/g'):
        # This is the broken line - check next line
        if i + 1 < len(lines) and lines[i+1].lstrip().startswith("/g"):
            print(f'Found broken regex at lines {i+1}-{i+2}')
            print(f'  Line {i+1}: {repr(line.rstrip())}')
            print(f'  Line {i+2}: {repr(lines[i+1].rstrip())}')
            
            # Merge and fix
            merged = line.rstrip() + '\\n' + lines[i+1].lstrip()
            print(f'  Merged: {repr(merged[:80])}')
            fixed_lines.append(merged + '\n')
            i += 2
            fixes_applied += 1
            continue
    
    fixed_lines.append(line)
    i += 1

if fixes_applied > 0:
    print(f'\nApplied {fixes_applied} fix(es)')
    
    # Write back
    with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'w', encoding='utf-8') as f:
        f.writelines(fixed_lines)
    
    print(f'Fixed file written. New line count: {len(fixed_lines)}')
else:
    print('\nNo fixes needed or pattern not found')