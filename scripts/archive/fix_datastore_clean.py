# -*- coding: utf-8 -*-
"""彻底修复DataStore问题"""
import sys
import io
import re
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"Original size: {len(content)} chars")

# Remove ALL existing DataStore scripts
# Match various patterns
patterns_to_remove = [
    r'<!-- DataStore.*?-->\s*<script>.*?</script>',
    r'<!-- 内联DataStore.*?-->\s*<script>.*?</script>',
    r'<!-- 确保DataStore立即可用.*?-->\s*<script>.*?</script>',
    r'<!-- DataStore Early Initialization.*?-->\s*<script>.*?</script>',
    r'<script>\s*//.*?DataStore.*?</script>',
]

for pattern in patterns_to_remove:
    new_content = re.sub(pattern, '', content, flags=re.DOTALL)
    if new_content != content:
        print(f"Removed pattern: {pattern[:50]}...")
        content = new_content

print(f"After cleanup: {len(content)} chars")

# Generate new timestamp
new_ts = str(int(time.time()))
print(f"New version: {new_ts}")

# Update versions
content = re.sub(r"APP_VERSION = '\d+'", f"APP_VERSION = '{new_ts}'", content)
content = re.sub(r'v=\d+', f'v={new_ts}', content)
print(f"Updated versions")

# Add CLEAN DataStore initialization right after <head>
early_init = '''
  <!-- DataStore Initialization -->
  <script>
    window.DataStore = {
      STORAGE_KEY: 'finance-tool',
      BACKUP_KEY: 'finance-tool-backup',
      CACHE_PREFIX: 'cache_',
      load: function() {
        try {
          var stored = localStorage.getItem(this.STORAGE_KEY);
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
          var key = this.CACHE_PREFIX + date;
          var cached = localStorage.getItem(key);
          return cached ? JSON.parse(cached) : null;
        } catch (e) { return null; }
      },
      setCache: function(date, data) {
        try {
          var key = this.CACHE_PREFIX + date;
          localStorage.setItem(key, JSON.stringify(data));
          return true;
        } catch (e) { return false; }
      }
    };
    console.log('[Init] DataStore initialized');
  </script>
'''

# Insert after <head>
if '<head>' in content:
    content = content.replace('<head>', '<head>' + early_init, 1)
    print("Added DataStore initialization")

# Save file
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Saved! New size: {len(content)} chars")
print("\nCommit and push:")
print("  git add index-new.html && git commit -m 'fix: clean DataStore init' && git push")
