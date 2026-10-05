#!/bin/bash
# Patch y-excalidraw to sync during drag
echo "Patching y-excalidraw..."
sed -i 's/state.cursorButton === "up" &&//g' node_modules/@ndy-onl/y-excalidraw/dist/index.js
