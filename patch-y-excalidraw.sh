#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log("Patching y-excalidraw for live dragging with DEBUG LOGS...");

const targetPath = path.join(__dirname, 'node_modules', '@ndy-onl', 'y-excalidraw', 'dist', 'index.js');

if (!fs.existsSync(targetPath)) {
    console.error("Could not find y-excalidraw dist/index.js");
    process.exit(0);
}

let content = fs.readFileSync(targetPath, 'utf8');

// Remove the 'cursorButton === up' check in onChange
content = content.replace(/state\.cursorButton === "up" &&\s*/g, '');

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
                const elements = this.api.getSceneElementsIncludingDeleted();
                if (!areElementsSame(this.lastKnownElements, elements)) {
                    const res = getDeltaOperationsForElements(this.lastKnownElements, elements);
                    if (res.operations.length > 0) {
                        const updateOps = res.operations.filter(op => op.type === "update");
                        if (updateOps.length > 0) {
                            console.log("[y-excalidraw] LIVE DRAG SYNC:", updateOps.length, "elements updating. e.g.", updateOps[0].element.id, "x:", updateOps[0].element.x);
                        }
                        this.lastKnownElements = res.lastKnownElements;
                        applyElementOperations(this.yElements, res.operations, this);
                    }
                }
            }
        };`;

// Inject into onPointerUpdate
if (content.includes(oldPointer)) {
    content = content.replace(oldPointer, newPointer);
} else {
    // If it's already patched with getSceneElementsIncludingDeleted(), replace that block
    const existingPatch = `        this.onPointerUpdate = (payload) => {
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
    content = content.replace(existingPatch, newPointer);
}

// Add debug log to remote element receiver
const remoteReceiverStr = `        this._remoteElementsChangeHandler = (event, txn) => {
            if (txn.origin === this) {
                return;
            }
            const elements = yjsToExcalidraw(this.yElements);
            this.lastKnownElements = elements;
            this.api.updateScene({ elements });
        };`;

const newRemoteReceiverStr = `        this._remoteElementsChangeHandler = (event, txn) => {
            if (txn.origin === this) {
                return;
            }
            const elements = yjsToExcalidraw(this.yElements);
            console.log("[y-excalidraw] REMOTE UPDATE RECEIVED:", elements.length, "elements total.");
            this.lastKnownElements = elements;
            this.api.updateScene({ elements });
        };`;

if (content.includes(remoteReceiverStr)) {
    content = content.replace(remoteReceiverStr, newRemoteReceiverStr);
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log("Done patching.");
