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

const oldAddedFiles = `const addedFiles = [...events.keysChanged].map((key) => this.yAssets.get(key));`;
const newAddedFiles = `
const addedFiles = [...events.keysChanged].map((key) => this.yAssets.get(key)).filter(Boolean);
addedFiles.forEach(file => {
    if (file.dataURL && file.dataURL.startsWith('http')) {
        fetch(file.dataURL)
        .then(res => res.blob())
        .then(blob => {
            const reader = new FileReader();
            reader.onload = () => {
                this.api.addFiles([{ ...file, dataURL: reader.result }]);
            };
            reader.readAsDataURL(blob);
        }).catch(e => console.error("Failed to fetch remote S3 asset", e));
    } else if (file.dataURL) {
        this.api.addFiles([file]);
    }
});
// Avoid original addFiles call
`;

if (content.includes(oldAddedFiles)) {
    content = content.replace(oldAddedFiles, newAddedFiles);
    // Remove the original this.api.addFiles(addedFiles) call since we do it inside the loop
    content = content.replace(/this.api.addFiles\(addedFiles\);/g, '');
}
fs.writeFileSync(targetPath, content, 'utf8');

const indexPath2 = path.join(__dirname, 'node_modules', '@ndy-onl', 'y-excalidraw', 'dist', 'index.js');
let indexContent = fs.readFileSync(indexPath2, 'utf8');

indexContent = indexContent.replace(
    'const res = getDeltaOperationsForAssets(this.lastKnownFileIds, files);',
    'const res = getDeltaOperationsForAssets(this.lastKnownFileIds, files);\nconsole.log("[y-excalidraw] LOCAL FILES CHANGE DETECTED:", Object.keys(files || {}).length, "files. Delta operations:", res.operations.length);'
);

indexContent = indexContent.replace(
    'const validFiles = Object.values(addedFiles).filter(Boolean);',
    'const validFiles = Object.values(addedFiles).filter(Boolean);\nconsole.log("[y-excalidraw] REMOTE FILES RECEIVED:", validFiles.length, "valid files.");'
);

fs.writeFileSync(indexPath2, indexContent);

const diffPath = path.join(__dirname, 'node_modules', '@ndy-onl', 'y-excalidraw', 'dist', 'diff.js');
let diffContent = fs.readFileSync(diffPath, 'utf8');

diffContent = diffContent.replace(
    'export const getDeltaOperationsForAssets = (lastKnownFileIds, files) => {',
    'export const getDeltaOperationsForAssets = (lastKnownFileIds, files) => {\nconsole.log("[y-excalidraw-diff] Computing asset delta. files:", files ? Object.keys(files) : "null");'
);

diffContent = diffContent.replace(
    'operations.push({ type: "append", id: fileId, asset: files[fileId] });',
    'console.log("[y-excalidraw-diff] Appending asset:", fileId); operations.push({ type: "append", id: fileId, asset: files[fileId] });'
);

fs.writeFileSync(diffPath, diffContent);

indexContent = indexContent.replace(
    'applyElementOperations(this.yElements, operations, this);',
    'if (this.yElements.doc) { this.yElements.doc.transact(() => { applyElementOperations(this.yElements, operations, this); }, this); } else { applyElementOperations(this.yElements, operations, this); }'
);

const customApplyAssets = `
if (this.yAssets && this.yAssets.doc) { 
    this.yAssets.doc.transact(() => { 
        assetOperations.forEach(op => {
            if (op.type === 'append' && op.asset && op.asset.dataURL && op.asset.dataURL.startsWith('data:')) {
                const asset = op.asset;
                const ext = asset.mimeType === 'image/jpeg' ? 'jpg' : asset.mimeType === 'image/svg+xml' ? 'svg' : 'png';
                fetch('/api/s3/presign?filename=' + asset.id + '.' + ext + '&contentType=' + asset.mimeType)
                .then(r => r.json())
                .then(async ({ presignedUrl, publicUrl }) => {
                    console.log("[y-excalidraw] Uploading image to S3...", publicUrl);
                    const blob = await (await fetch(asset.dataURL)).blob();
                    await fetch(presignedUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': asset.mimeType } });
                    console.log("[y-excalidraw] Upload complete, syncing S3 URL via Yjs");
                    this.yAssets.set(op.id, { ...asset, dataURL: publicUrl });
                }).catch(console.error);
                
                // Set temporary placeholder to avoid syncing base64
                this.yAssets.set(op.id, { ...asset, dataURL: '' }); 
            } else if (op.type === 'append') {
                this.yAssets.set(op.id, op.asset);
            } else if (op.type === 'delete') {
                this.yAssets.delete(op.id);
            }
        });
    }, this); 
} else { applyAssetOperations(this.yAssets, assetOperations, this); }
`;
indexContent = indexContent.replace(
    'applyAssetOperations(this.yAssets, assetOperations, this);',
    customApplyAssets
);

fs.writeFileSync(indexPath2, indexContent);

console.log("Logs injected successfully!");
