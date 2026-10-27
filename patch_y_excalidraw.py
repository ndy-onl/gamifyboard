import re

with open('node_modules/@ndy-onl/y-excalidraw/dist/index.js', 'r') as f:
    content = f.read()

content = re.sub(
    r'if \(state\.cursorButton === "up" &&\s+!areElementsSame\(this\.lastKnownElements, elements\)\) \{',
    r'if (!areElementsSame(this.lastKnownElements, elements)) {',
    content
)

with open('node_modules/@ndy-onl/y-excalidraw/dist/index.js', 'w') as f:
    f.write(content)

