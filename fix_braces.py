#!/usr/bin/env python3
# Fix brace imbalance

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html.FINAL_CLEAN', 'r', encoding='utf-8') as f:
    content = f.read()

print('Original size:', len(content))

open_b = content.count('{')
close_b = content.count('}')
diff = open_b - close_b
print(f'Brace diff before: {diff} ({open_b} open, {close_b} close)')

if diff == 1:
    # Need to add one closing brace at the end of script
    if '</script>' in content:
        content = content.replace('</script>', '\n}\n</script>')
        print('Added closing brace before </script>')
    else:
        content += '\n}'
        content += '\n</script>'
        print('Added closing brace at end')

elif diff == -1:
    # Need to remove one closing brace
    # Find the last occurrence of } before </script>
    script_end = content.rfind('</script>')
    if script_end > 0:
        # Look backwards from </script>
        for i in range(script_end - 1, max(0, script_end - 100), -1):
            if content[i] == '}':
                content = content[:i] + content[i+1:]
                print('Removed one closing brace')
                break

# Final check
open_b = content.count('{')
close_b = content.count('}')
diff = open_b - close_b
print(f'\nFinal brace balance: {open_b} open, {close_b} close, diff {diff}')

# Write
output_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html.FIXED'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nWritten to: {output_path}')
print('Final size:', len(content))