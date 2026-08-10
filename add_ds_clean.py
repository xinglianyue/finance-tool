# -*- coding: utf-8 -*-
"""Add DataStore to restored clean file"""
import sys
import io
import re
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"Restored file size: {len(content)} chars")
print(f"Has <head>: {'<head>' in content}")
print(f"Has </head>: {'</head>' in content}")

# Generate new timestamp
new_ts = str(int(time.time()))
print(f"New version: {new_ts}")

# Create DataStore initialization script
ds_init = '''  <!-- DataStore Initialization -->
  <script>
    window.DataStore = {
      STORAGE_KEY: 'finance-tool',
      BACKUP_KEY: 'finance-tool-backup',
      CACHE_PREFIX: 'cache_',
      load: function() { var s = localStorage.getItem(this.STORAGE_KEY); return s ? JSON.parse(s) : null; },
      save: function(d) { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(d)); return true; },
      getCache: function(date) { var k = this.CACHE_PREFIX + date; var c = localStorage.getItem(k); return c ? JSON.parse(c) : null; },
      setCache: function(date, data) { localStorage.setItem(this.CACHE_PREFIX + date, JSON.stringify(data)); return true; },
      clear: function() { localStorage.removeItem(this.STORAGE_KEY); localStorage.removeItem(this.BACKUP_KEY); },
      validate: function(d) { return d && typeof d === 'object'; },
      backup: function() { var d = this.load(); if (d) localStorage.setItem(this.BACKUP_KEY, JSON.stringify(d)); },
      restoreFromBackup: function() { var b = localStorage.getItem(this.BACKUP_KEY); if (b) { localStorage.setItem(this.STORAGE_KEY, b); return JSON.parse(b); } return null; }
    };
    console.log('[Init] DataStore initialized');
    console.log('[Init] DataStore.save type:', typeof window.DataStore.save);
  </script>
'''

# Insert right after <head> tag
if '<head>' in content:
    content = content.replace('<head>', '<head>\n' + ds_init, 1)
    print("✓ Added DataStore initialization")
else:
    print("✗ ERROR: No <head> tag found!")
    sys.exit(1)

# Update versions
content = re.sub(r"APP_VERSION = '\d+'", f"APP_VERSION = '{new_ts}'", content)
content = re.sub(r'v=\d+', f'v={new_ts}', content)
print(f"✓ Updated versions to {new_ts}")

# Save file
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✓ Saved! New size: {len(content)} chars")

# Verify
with open(path, "r", encoding="utf-8") as f:
    verify = f.read()
    checks = [
        ('DataStore init present', 'window.DataStore = {' in verify),
        ('save method present', 'save: function' in verify),
        ('load method present', 'load: function' in verify),
        ('Version updated', new_ts in verify),
        ('Chinese title correct', '财务分析工具' in verify),
    ]
    
    print("\nVerification:")
    all_pass = True
    for name, result in checks:
        status = 'PASS' if result else 'FAIL'
        print(f"  [{status}] {name}")
        if not result:
            all_pass = False
    
    if all_pass:
        print("\n✓ ALL CHECKS PASSED!")
    else:
        print("\n✗ SOME CHECKS FAILED!")
        sys.exit(1)

print("\nNext steps:")
print("  git add index-new.html && git commit -m 'fix: DataStore initialization' && git push")
