# -*- coding: utf-8 -*-
"""Simple encoding fix"""
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"Original size: {len(content)} chars")

# Find all lines with common garbled patterns
garbled_chars = ['鐗', '鏁', '鎵', '閾', '鍔', '璐', '缃', '鍩', '甯', '鍘', '鍖']

lines_to_fix = []
for i, line in enumerate(content.split('\n'), start=1):
    for char in garbled_chars:
        if char in line:
            lines_to_fix.append((i, line))
            break

print(f"Found {len(lines_to_fix)} lines with garbled text\n")

# Show first 10 problematic lines
for line_num, line in lines_to_fix[:10]:
    print(f"Line {line_num}: {line[:80]}")

# Now let's try to fix by reading from a known good backup
print("\nChecking backups...")
import os
backups = [f for f in os.listdir(r"C:\Users\xinxi\Desktop\财务工具") if f.startswith('index-new.html.bak')]
if backups:
    backup_path = os.path.join(r"C:\Users\xinxi\Desktop\财务工具", backups[0])
    print(f"Using backup: {backups[0]}")
    
    with open(backup_path, "rb") as f:
        backup_data = f.read()
    
    # Try to decode as UTF-8
    try:
        backup_content = backup_data.decode('utf-8')
        print("✓ Backup is valid UTF-8")
        
        # Check if backup has garbled text
        backup_garbled = sum(1 for char in garbled_chars if char in backup_content)
        print(f"Garbled patterns in backup: {backup_garbled}")
        
        if backup_garbled == 0:
            print("\nUsing backup as base...")
            content = backup_content
            
            # Update version
            import time
            new_ts = str(int(time.time()))
            old_ts = '1786009953'
            content = content.replace(old_ts, new_ts)
            print(f"Updated version to: {new_ts}")
            
            # Write back
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            
            print(f"\n✓ Fixed! New size: {len(content)} chars")
        else:
            print("⚠ Backup also has issues, need manual fix")
    except Exception as e:
        print(f"Error with backup: {e}")
