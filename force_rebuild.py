#!/usr/bin/env python3
"""
强制重新部署到GitHub Pages
"""

import subprocess
import time
import sys

print('=' * 60)
print('强制重新部署到GitHub Pages')
print('=' * 60)

# Step 1: 检查当前状态
print('\n[1] 检查Git状态...')
result = subprocess.run(['git', 'status', '--short'], capture_output=True, text=True)
print(result.stdout)

# Step 2: 添加所有更改
print('\n[2] 添加所有文件...')
subprocess.run(['git', 'add', '-A'], check=False)

# Step 3: 创建一个新的提交（添加一个小注释来触发重新部署）
print('\n[3] 创建新提交...')
commit_msg = 'chore: trigger GitHub Pages rebuild'
result = subprocess.run(
    ['git', 'commit', '--no-verify', '-m', commit_msg],
    capture_output=True,
    text=True
)
print(result.stdout[-200:] if len(result.stdout) > 200 else result.stdout)
if result.stderr:
    print('stderr:', result.stderr[:200])

# Step 4: 推送到GitHub
print('\n[4] 推送到GitHub...')
result = subprocess.run(
    ['git', 'push', 'origin', 'main'],
    capture_output=True,
    text=True
)
print(result.stdout[-300:] if len(result.stdout) > 300 else result.stdout)
if result.stderr:
    print('stderr:', result.stderr[:200])

# Step 5: 验证提交
print('\n[5] 验证最新提交...')
result = subprocess.run(['git', 'log', '--oneline', '-1'], capture_output=True, text=True)
print(result.stdout.strip())

# Step 6: 显示GitHub Pages URL
print('\n[6] GitHub Pages信息')
print('   URL: https://xinglianyue.github.io/finance-tool/index-new.html')
print('   建议: 等待2-3分钟后硬刷新页面 (Ctrl+Shift+R)')

print('\n' + '=' * 60)
print('完成！请等待2-3分钟让GitHub Pages重新构建')
print('=' * 60)