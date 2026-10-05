#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log("Patching y-excalidraw for live dragging...");

const targetPath = path.join(__dirname, 'node_modules', '@ndy-onl', 'y-excalidraw', 'dist', 'index.js');

if (!fs.existsSync(targetPath)) {
    console.error("Could not find y-excalidraw dist/index.js");
    process.exit(0); // Exit 0 so we don't break install if it's missing somehow
}

let content = fs.readFileSync(targetPath, 'utf8');

// Remove the 'cursorButton === up' check in onChange
content = content.replace(/state\.cursorButton === "up" &&\s*/g, '');

// Inject element syncing into onPointerUpdate
const oldPointer = `        this.onPointerUpdate = (payload) => {
            if (this.awareness) {
                this.awareness.setLocalStateField("pointer", payload.pointer);
                this.awareness.setLocalStateField("button", payload.button);
            }
        };`;

const newPointer = `        this.onPointerUpdate = (payload) => {
            if (this.awareness) {
                this.awareness.setLocalStateField("pointer", payload.pointer);
                this.awareness.setLocalStateField("button", payload.button);
            }
            if (this.api && this.yElements) {
                // Must use getSceneElementsIncludingDeleted to match what onChange does
                // otherwise lastKnownElements lengths will flip-flop and break operations!
                const elements = this.api.getSceneElementsIncludingDeleted();
                if (!areElementsSame(this.lastKnownElements, elements)) {
                    const res = getDeltaOperationsForElements(this.lastKnownElements, elements);
                    if (res.operations.length > 0) {
                        this.lastKnownElements = res.lastKnownElements;
                        applyElementOperations(this.yElements, res.operations, this);
                    }
                }
            }
        };`;

if (content.includes(oldPointer)) {
    content = content.replace(oldPointer, newPointer);
} else {
    // If it's already patched with getSceneElements(), replace that with getSceneElementsIncludingDeleted()
    content = content.replace('const elements = this.api.getSceneElements();', 'const elements = this.api.getSceneElementsIncludingDeleted();');
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log("Done patching.");
