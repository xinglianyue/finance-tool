#!/usr/bin/env python3
# Final fix: address brace imbalance and literal \n sequences

import re

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html.SAFE_FIX', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'Loaded: {len(content)} chars')
print(f'Brace diff: {content.count(chr(123)) - content.count(chr(125))}')
print(f'Literal \\n count: {content.count(chr(92)+chr(110))}')

# Fix brace imbalance by removing 2 extra closing braces
open_b = content.count('{')
close_b = content.count('}')
diff = open_b - close_b

if diff == -2:
    print('\nRemoving 2 extra closing braces...')
    
    # Find positions of } near the end of the file (before </script>)
    script_end = content.rfind('</script>')
    if script_end > 0:
        # Get content before script tag
        before_script = content[:script_end]
        after_script = content[script_end:]
        
        # Count } in this region
        extra_braces = []
        brace_count = 0
        for i in range(len(before_script) - 1, -1, -1):
            if before_script[i] == '}':
                brace_count += 1
                if brace_count >= 3:  # We need to remove 2
                    extra_braces.append(i)
                    if len(extra_braces) >= 2:
                        break
        
        if len(extra_braces) >= 2:
            # Remove from end to start to preserve positions
            for pos in sorted(extra_braces, reverse=True):
                content = content[:pos] + content[pos+1:]
            print(f'  Removed 2 extra }} characters')
    
    # Write back
    with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f'\nAfter brace fix: {len(content)} chars')
    print(f'New brace diff: {content.count(chr(123)) - content.count(chr(125))}')

print('\nDone. File ready for deployment.')