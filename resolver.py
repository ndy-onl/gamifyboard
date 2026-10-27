import re

with open('excalidraw-app/App.tsx', 'r') as f:
    c = f.read()

parts = re.split(r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> upstream/master', c, flags=re.DOTALL)
print(f"Found {len(parts)//3} conflicts")

