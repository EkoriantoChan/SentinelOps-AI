import json

with open('workflows/2-core-agent.json', 'r', encoding='utf-8') as f:
    wf = json.load(f)

for n in wf['nodes']:
    if 'Transkripsi' in n['name']:
        code = n['parameters']['pythonCode']
        target = '    b\'--\' + boundary.encode() + b\'\\r\\nContent-Disposition: form-data; name="language"\\r\\n\\r\\nid\\r\\n\'\n'
        if target in code:
            n['parameters']['pythonCode'] = code.replace(target, '')
            print('Successfully removed language=id!')
        else:
            print('Target not found, checking repr...')
            print(repr(code[400:600]))

with open('workflows/2-core-agent.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, indent=2)
