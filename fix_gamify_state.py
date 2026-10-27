import re

with open('excalidraw-app/App.tsx', 'r') as f:
    content = f.read()

# Replace isDeleted: true with isDeleted: false
content = content.replace("isDeleted: true,", "isDeleted: false,")

with open('excalidraw-app/App.tsx', 'w') as f:
    f.write(content)
