import re

with open('node_modules/@ndy-onl/y-excalidraw/dist/index.js', 'r') as f:
    content = f.read()

old_pointer = """        this.onPointerUpdate = (payload) => {
            if (this.awareness) {
                this.awareness.setLocalStateField("pointer", payload.pointer);
                this.awareness.setLocalStateField("button", payload.button);
            }
        };"""

new_pointer = """        this.onPointerUpdate = (payload) => {
            if (this.awareness) {
                this.awareness.setLocalStateField("pointer", payload.pointer);
                this.awareness.setLocalStateField("button", payload.button);
            }
            if (this.api && this.yElements) {
                const elements = this.api.getSceneElements();
                if (!areElementsSame(this.lastKnownElements, elements)) {
                    const res = getDeltaOperationsForElements(this.lastKnownElements, elements);
                    if (res.operations.length > 0) {
                        this.lastKnownElements = res.lastKnownElements;
                        applyElementOperations(this.yElements, res.operations, this);
                    }
                }
            }
        };"""

content = content.replace(old_pointer, new_pointer)

with open('node_modules/@ndy-onl/y-excalidraw/dist/index.js', 'w') as f:
    f.write(content)
