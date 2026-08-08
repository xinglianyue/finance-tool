# -*- coding: utf-8 -*-
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r"C:\Users\xinxi\Desktop\财务工具\index-new.html"

with open(path, "rb") as f:
    raw = f.read()

content = raw.decode('utf-8', errors='replace')
lines = content.split('\n')

print("Checking problematic lines:\n")

# Line 27
print(f"Line 27: {repr(lines[26])}")
print()

# Line 1273
print(f"Line 1273: {repr(lines[1272])}")
print()

# Line 1578
print(f"Line 1578: {repr(lines[1577])}")
print()

# Check for replacement characters
replaced = content.count('\ufffd')
print(f"Total replacement characters: {replaced}")

# Find all lines with replacement characters
problem_lines = []
for i, line in enumerate(lines, start=1):
    if '\ufffd' in line:
        problem_lines.append((i, line))
        if len(problem_lines) <= 10:
            print(f"\nLine {i} contains replacement char:")
            print(f"  {repr(line[:100])}")

print(f"\nTotal lines with issues: {len(problem_lines)}")
