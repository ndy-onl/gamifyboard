#!/bin/bash
echo "Patching y-excalidraw for live dragging..."

# Remove the 'cursorButton === up' check in onChange
sed -i 's/state.cursorButton === "up" &&//g' node_modules/@ndy-onl/y-excalidraw/dist/index.js

# Inject element syncing into onPointerUpdate
cat << 'INJECT' > patch.py
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

if old_pointer in content:
    content = content.replace(old_pointer, new_pointer)
    with open('node_modules/@ndy-onl/y-excalidraw/dist/index.js', 'w') as f:
        f.write(content)
INJECT

python3 patch.py
rm patch.py
echo "Done patching."
