import re

with open('excalidraw-app/App.tsx', 'r') as f:
    content = f.read()

old_scroll = """          excalidrawAPI.scrollToContent(frame, { animate: true });"""
new_scroll = """          if (typeof (excalidrawAPI as any).scrollToContent === "function") {
            (excalidrawAPI as any).scrollToContent(frame, { animate: true });
          } else if (typeof excalidrawAPI.setViewport === "function") {
            excalidrawAPI.setViewport({ target: [frame], fit: "contain", animate: true });
          } else {
            console.error("No scroll function found on excalidrawAPI");
          }"""

content = content.replace(old_scroll, new_scroll)

with open('excalidraw-app/App.tsx', 'w') as f:
    f.write(content)
