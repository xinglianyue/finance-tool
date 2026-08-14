# -*- coding: utf-8 -*-
"""Add DataStore initialization after restoring from backup"""
import sys
import io
import re
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"Restored file size: {len(content)} chars")

# Check if DataStore init already exists
if 'window.DataStore' in content and 'STORAGE_KEY' in content:
    print("DataStore already exists in file")
else:
    # Generate new timestamp
    new_ts = str(int(time.time()))
    print(f"New version: {new_ts}")

    # Add DataStore initialization after <head>
    ds_init = '''
  <!-- DataStore Initialization -->
  <script>
    window.DataStore = {
      STORAGE_KEY: 'finance-tool',
      BACKUP_KEY: 'finance-tool-backup',
      CACHE_PREFIX: 'cache_',
      load: function() {
        try {
          const stored = localStorage.getItem(this.STORAGE_KEY);
          return stored ? JSON.parse(stored) : null;
        } catch (e) { return null; }
      },
      save: function(data) {
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
          return true;
        } catch (e) { return false; }
      },
      getCache: function(date) {
        try {
          const key = this.CACHE_PREFIX + date;
          const cached = localStorage.getItem(key);
          return cached ? JSON.parse(cached) : null;
        } catch (e) { return null; }
      },
      setCache: function(date, data) {
        try {
          const key = this.CACHE_PREFIX + date;
          localStorage.setItem(key, JSON.stringify(data));
          return true;
        } catch (e) { return false; }
      }
    };
    console.log('[Init] DataStore initialized');
  </script>
'''

    # Insert after <head>
    content = content.replace('<head>', '<head>' + ds_init, 1)
    print("Added DataStore initialization")

    # Update versions
    content = re.sub(r"APP_VERSION = '\d+'", f"APP_VERSION = '{new_ts}'", content)
    content = re.sub(r'v=\d+', f'v={new_ts}', content)
    print(f"Updated versions to {new_ts}")

# Save file
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Saved! New size: {len(content)} chars")
print("\nCommit: git add index-new.html && git commit -m 'fix: add DataStore init' && git push")
