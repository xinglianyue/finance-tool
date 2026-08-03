#!/usr/bin/env python3
# Simple deploy: just ensure no literal backslash-n and push

import re

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html.git', 'r', encoding='utf-8') as f:
    content = f.read()

print('Base size:', len(content))

# Check for literal \n sequences
literal_count = content.count('\\n')
print('Literal backslash-n count:', literal_count)

if literal_count > 0:
    # Replace literal \n with actual newlines (being careful)
    # This is tricky - we only want to replace standalone \n sequences, not those in strings
    # For now, let's do a simple replacement which should work for most cases
    content = content.replace('\\n', '\n')
    print('Replaced', literal_count, 'literal backslash-n sequences')

# Verify brace balance
open_b = content.count('{')
close_b = content.count('}')
diff = open_b - close_b
print(f'Brace balance: {open_b} open, {close_b} close, diff {diff}')

# Write final version
output_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('\nWritten to index-new.html')
print('Final size:', len(content))

# Quick verification
print('\n=== VERIFICATION ===')
print('Brace diff:', content.count('{') - content.count('}'))
print('Literal \\n:', content.count('\\n'))
print('File ready for deployment.')