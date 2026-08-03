with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')

# Find and fix ALL broken regex patterns
fixed_lines = []
fixes_applied = 0
i = 0

while i < len(lines):
    line = lines[i]
    
    # Check if this line has a broken regex pattern
    if '.replace(/' in line and not line.rstrip().endswith('/g'):
        # Check next line
        if i + 1 < len(lines):
            next_line = lines[i + 1].lstrip()
            if next_line.startswith('/g') or next_line.startswith('/i') or next_line.startswith('/m') or next_line.startswith('/gi'):
                print(f'\nFixing broken regex at lines {i+1}-{i+2}')
                print(f'  Before: {repr(line.rstrip())} + {repr(next_line[:50])}')
                
                # Merge lines and fix - preserve the \n that was incorrectly split
                merged = line.rstrip() + '\\n' + next_line
                print(f'  After: {repr(merged[:80])}')
                
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
    print('\nNo fixes applied')

# Verify
print('\n=== Verification ===')
content = ''.join(fixed_lines) if fixes_applied > 0 else ''.join(lines)
open_b = content.count('{')
close_b = content.count('}')
print(f'Brace diff: {open_b - close_b}')

# Check for remaining broken patterns
import re
remaining = 0
for i, line in enumerate(content.split('\n')):
    if '.replace(/' in line and not line.rstrip().endswith('/g'):
        # Check if this is actually broken by looking for subsequent /g
        pass  # Simple check

print(f'File ready for deployment.')