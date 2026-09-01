with open('src/app/(tabs)/settings.tsx', 'r') as f:
    content = f.read()

# Find the exact character position
idx = content.find('server')
while idx >= 0:
    context = content[idx:idx+80]
    if 'Google' in context:
        apostrophe_idx = context.find(chr(39))
        if apostrophe_idx >= 0:
            absolute_idx = idx + apostrophe_idx
            print('Found at absolute index:', absolute_idx)
            replacement = '''
            content = content[:absolute_idx] + replacement + content[absolute_idx+1:]
            break
    idx = content.find('server', idx+1)

with open('src/app/(tabs)/settings.tsx', 'w') as f:
    f.write(content)
print('Done')