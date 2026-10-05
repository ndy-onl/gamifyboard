import json

with open('package.json', 'r') as f:
    data = json.load(f)

data['scripts']['postinstall'] = "./patch-y-excalidraw.sh"

with open('package.json', 'w') as f:
    json.dump(data, f, indent=2)

