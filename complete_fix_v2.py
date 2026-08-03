#!/usr/bin/env python3
# COMPLETE FIX from scratch - address ALL issues systematically

import re

with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html.bak_v3', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'Loaded backup: {len(content)} chars')
print(f'Initial brace diff: {content.count(chr(123)) - content.count(chr(125))}')
print(f'Initial literal \\n count: {content.count(chr(92)+chr(110))}')

# Step 1: Remove duplicate function definitions (keep last occurrence)
functions_to_dedup = ['parseRecord', 'buildV3Data', 'checkCloudForUpdates']

for func in functions_to_dedup:
    # Find all occurrences
    matches = list(re.finditer(r'(?:async\s+)?function\s+' + re.escape(func) + r'\s*\([^)]*\)\s*\{', content))
    if len(matches) > 1:
        print(f'{func}: Found {len(matches)} definitions, keeping last one')
        
        # Keep everything before first definition and everything after last definition
        first_start = matches[0].start()
        last_end = matches[-1].end()
        
        # Find the end of the last definition
        pos = last_end
        brace = 0
        while pos < len(content) and brace >= 0:
            if content[pos] == '{': brace += 1
            elif content[pos] == '}': brace -= 1
            pos += 1
        last_func_end = pos
        
        # Rebuild: keep content before first + keep last definition + rest
        new_content = content[:first_start] + content[last_func_end:]
        content = new_content
        print(f'  Reduced to 1 definition')

# Step 2: Fix brace imbalance
open_b = content.count('{')
close_b = content.count('}')
diff = open_b - close_b
print(f'\nBrace diff after dedup: {diff}')

if diff < 0:
    # Need to remove |diff| closing braces
    # Find the last few } characters and remove them
    target_remove = abs(diff)
    positions = [i for i, c in enumerate(content) if c == '}']
    if len(positions) >= target_remove:
        # Remove from the end (but be careful not to break structure)
        # Look for } that appear right before </script> or at end of meaningful blocks
        for pos in reversed(positions[-target_remove:]):
            # Check if this is a safe place to remove
            # A safe place is right before whitespace and another } or end of block
            remaining = content[pos+1:].lstrip()
            if remaining == '' or remaining.startswith('</script>') or remaining.startswith('//'):
                content = content[:pos] + content[pos+1:]
                print(f'  Removed extra }} at position {pos}')

# Step 3: Fix literal backslash-n sequences
# These are problematic when they appear outside of strings/regex
# Let's identify and fix them

# Pattern 1: .replace(/\n followed by actual newline then /g
broken_regexes = list(re.finditer(r'\.replace\(/\\n\s*\n/g', content))
print(f'\nFound {len(broken_regexes)} broken regex patterns')

for m in broken_regexes:
    print(f'  Fixing at position {m.start()}')
    # Replace with correct pattern
    content = content[:m.start()] + '.replace(/\\n/g' + content[m.end():]

# Pattern 2: .join(' followed by actual newline then ')
broken_strings = list(re.finditer(r"\.join\('\s*\n\s*'\)", content))
print(f'Found {len(broken_strings)} broken string patterns')

for m in broken_strings:
    print(f'  Fixing at position {m.start()}')
    # Replace with correct pattern  
    content = content[:m.start()] + ".join('\\n')" + content[m.end():]

# Step 4: Ensure async declarations
async_funcs = ['loadFromCloud', 'switchImportDate', 'checkCloudForUpdates']
for func in async_funcs:
    if f'async function {func}' not in content:
        if f'function {func}(' in content:
            content = content.replace(f'function {func}(', f'async function {func}(', 1)
            print(f'Added async to {func}')

# Final verification
print('\n=== FINAL VERIFICATION ===')
open_b = content.count('{')
close_b = content.count('}')
diff = open_b - close_b
print(f'Brace balance: {open_b} open, {close_b} close, diff {diff}')

literal_ns = content.count('\\n')
print(f'Literal \\n count: {literal_ns}')

funcs = ['switchTab', 'updateVersion', 'loadFromCloud', 'switchImportDate', 
         'checkCloudForUpdates', 'buildV3Data', 'parseRecord']
for func in funcs:
    count = len(re.findall(r'function\s+' + func + r'\s*\(', content))
    status = 'OK (' + str(count) + ')' if count >= 1 else 'MISSING!'
    print(f'{func}: {status}')

# Write output
output_path = r'C:\Users\xinxi\Desktop\财务工具\index-new.html.COMPLETE'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nWritten to: {output_path}')
print(f'Final size: {len(content)} chars')