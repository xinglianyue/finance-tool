with open(r'C:\Users\xinxi\Desktop\财务工具\index-new.html', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
print('Total lines:', len(lines))

if len(lines) >= 1651:
    target = lines[1650]
    print('Line 1651 length:', len(target))
    print('Line 1651 repr:', repr(target[:150]))
    
    # Check for any non-printable or special characters
    for i, ch in enumerate(target[:50]):
        code = ord(ch)
        if code < 32 and ch not in '\t\n\r':
            print(f'Warning: Control character at position {i}: ord={code} (0x{code:02x})')
        elif code > 127:
            # Non-ASCII character
            pass  # This is OK for Chinese characters
    
    # Show byte representation of first 50 chars
    target_bytes = target.encode('utf-8')[:100]
    print('\nBytes (hex):', ' '.join(f'{b:02x}' for b in target_bytes[:50]))