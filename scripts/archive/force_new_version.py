# -*- coding: utf-8 -*-
"""Create a completely new version to force browser cache refresh"""
import time
import sys
import io
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"Current file size: {len(content)} chars")

# Generate a completely new timestamp
new_ts = str(int(time.time()))
print(f"New timestamp: {new_ts}")

# Replace ALL version numbers with the new one
old_versions = ['1786172985', '1786171450', '1786170308', '1786169745']
for old_v in old_versions:
    if old_v in content:
        content = content.replace(old_v, new_ts)
        print(f"Replaced: {old_v} -> {new_ts}")

# Ensure the DataStore initialization is present
if 'window.DataStore = {' not in content and 'DataStore fallback' not in content:
    ds_init = '''
  <!-- DataStore Initialization -->
  <script>
    window.DataStore = {
      STORAGE_KEY: 'finance-tool',
      BACKUP_KEY: 'finance-tool-backup',
      CACHE_PREFIX: 'cache_',
      load: function() { try { var s = localStorage.getItem(this.STORAGE_KEY); return s ? JSON.parse(s) : null; } catch(e) { return null; } },
      save: function(d) { try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(d)); return true; } catch(e) { return false; } },
      getCache: function(date) { try { var k = this.CACHE_PREFIX + date; var c = localStorage.getItem(k); return c ? JSON.parse(c) : null; } catch(e) { return null; } },
      setCache: function(date, data) { try { localStorage.setItem(this.CACHE_PREFIX + date, JSON.stringify(data)); return true; } catch(e) { return false; } },
      clear: function() { try { localStorage.removeItem(this.STORAGE_KEY); localStorage.removeItem(this.BACKUP_KEY); var i = localStorage.length; while(i--) { var k = localStorage.key(i); if (k && k.startsWith(this.CACHE_PREFIX)) localStorage.removeItem(k); } return true; } catch(e) { return false; } },
      validate: function(d) { return d && typeof d === 'object'; },
      backup: function() { try { var d = this.load(); if (d) { localStorage.setItem(this.BACKUP_KEY, JSON.stringify(d)); return true; } } catch(e) {} return false; },
      restoreFromBackup: function() { try { var b = localStorage.getItem(this.BACKUP_KEY); if (b) { localStorage.setItem(this.STORAGE_KEY, b); return JSON.parse(b); } } catch(e) {} return null; }
    };
    console.log('[Init] DataStore initialized');
  </script>
'''
    content = content.replace('</head>', ds_init + '\n</head>', 1)
    print("Added DataStore initialization")

# Write to file
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nSaved! New size: {len(content)} chars")
print(f"Version: {new_ts}")
