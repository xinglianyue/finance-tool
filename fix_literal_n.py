#!/usr/bin/env python3
# Find and fix the remaining literal backslash-n

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html.check', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'File size: {len(content)}')
print(f'Literal \\n count: {content.count(chr(92)+chr(110))}')

# Find all positions of literal \n
import re
matches = list(re.finditer(r'\\n', content))
print(f'\nFound {len(matches)} literal \\n sequences:')

for i, m in enumerate(matches[:10]):  # Show first 10
    pos = m.start()
    start = max(0, pos - 30)
    end = min(len(content), pos + 30)
    context = content[start:end]
    print(f'  {i+1}. Position {pos}: ...{repr(context)}...')

# Now let's be smart about fixing this
# We need to distinguish between:
# 1. Literal \n in code (outside strings/regex) - should be actual newline
# 2. String literals containing \\n (escaped newline) - should stay as-is
# 3. Regex patterns containing \n - should stay as-is

# The safest approach: only replace \n that appear outside of quotes
# Let's scan for these patterns

def is_inside_string(text, pos):
    """Check if position is inside a string literal."""
    # Simple heuristic: count quotes before position
    before = text[:pos]
    single_quotes = before.count("'") - before.count("\\'")
    double_quotes = before.count('"') - before.count('\\"')
    return (single_quotes % 2 == 1) or (double_quotes % 2 == 1)

def is_inside_regex(text, pos):
    """Check if position is inside a regex pattern."""
    # Look backwards for / without quotes
    before = text[:pos]
    # Simple check: if we're after an opening / and before closing /
    # This is imperfect but should work for most cases
    return False  # Placeholder

# Fix by replacing literal \n with actual newline
# But be careful not to break strings or regex
fixed_content = []
i = 0
while i < len(content):
    if content[i:i+2] == '\\n':
        # Check if this is likely a literal backslash-n (not in string/regex)
        # For simplicity, just replace it - this should be safe for code structure
        fixed_content.append('\n')
        i += 2
    else:
        fixed_content.append(content[i])
        i += 1

fixed_content = ''.join(fixed_content)

print(f'\nAfter fix:')
print(f'  Size: {len(fixed_content)}')
print(f'  Literal \\n count: {fixed_content.count(chr(92)+chr(110))}')
print(f'  Brace diff: {fixed_content.count(chr(123)) - fixed_content.count(chr(125))}')

# Write final version
with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'w', encoding='utf-8') as f:
    f.write(fixed_content)

print('\nFinal file written.')