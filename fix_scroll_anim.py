import re

with open('excalidraw-app/App.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'excalidrawAPI.setViewport({ target: [frame], fit: "contain", animate: true });',
    'excalidrawAPI.setViewport({ target: [frame], fit: "contain", animation: { duration: 300 }, offsets: { ui: true } });'
)

with open('excalidraw-app/App.tsx', 'w') as f:
    f.write(content)
