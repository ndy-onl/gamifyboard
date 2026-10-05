import re

with open('excalidraw-app/App.tsx', 'r') as f:
    content = f.read()

# Replace the button onClick logic
old_onClick = """          onClick={() => {
            const elements = excalidrawAPI?.getSceneElementsIncludingDeleted() || [];
            let stateElement = elements.find(el => el.id === "GAMIFY_BOARD_STATE");
            const newMode = !isEditMode;
            
            if (!stateElement) {
                stateElement = {
                    id: "GAMIFY_BOARD_STATE",
                    type: "rectangle",
                    x: -10000,
                    y: -10000,
                    width: 10,
                    height: 10,
                    angle: 0,
                    strokeColor: "transparent",
                    backgroundColor: "transparent",
                    fillStyle: "solid",
                    strokeWidth: 0,
                    strokeStyle: "solid",
                    roughness: 0,
                    opacity: 0,
                    groupIds: [],
                    strokeLineDash: [],
                    frameId: null,
                    roundness: null,
                    seed: 1,
                    version: 1,
                    versionNonce: 1,
                    isDeleted: false,
                    boundElements: null,
                    updated: Date.now(),
                    link: null,
                    locked: true,
                    customData: { isEditMode: newMode }
                };
                excalidrawAPI.updateScene({ elements: [...elements, stateElement] });
            } else {
                const newElements = elements.map(el => el.id === "GAMIFY_BOARD_STATE" ? { ...el, customData: { ...el.customData, isEditMode: newMode }, version: (el.version || 0) + 1 } : el);
                excalidrawAPI.updateScene({ elements: newElements });
            }
            setIsEditMode(newMode);
          }}"""

new_onClick = """          onClick={() => {
            const elements = excalidrawAPI?.getSceneElements() || [];
            const newMode = !isEditMode;
            
            const newElements = elements.map(el => ({
                ...el,
                customData: { ...el.customData, globalIsEditMode: newMode },
                version: (el.version || 0) + 1
            }));
            
            excalidrawAPI?.updateScene({ elements: newElements });
            setIsEditMode(newMode);
          }}"""

content = content.replace(old_onClick, new_onClick)

# Replace the onChange read logic
old_onChange = """          if (excalidrawAPI) {
            const stateElement = excalidrawAPI.getSceneElementsIncludingDeleted().find(el => el.id === "GAMIFY_BOARD_STATE");
            if (stateElement && stateElement.customData?.isEditMode !== undefined) {
               setIsEditMode(prev => {
                  if (prev !== stateElement.customData.isEditMode) return stateElement.customData.isEditMode;
                  return prev;
               });
            }
          }"""

new_onChange = """          if (excalidrawAPI) {
            const stateElement = excalidrawAPI.getSceneElements().find(el => el.customData?.globalIsEditMode !== undefined);
            if (stateElement && stateElement.customData?.globalIsEditMode !== undefined) {
               setIsEditMode(prev => {
                  if (prev !== stateElement.customData.globalIsEditMode) return stateElement.customData.globalIsEditMode;
                  return prev;
               });
            }
          }"""

content = content.replace(old_onChange, new_onChange)

with open('excalidraw-app/App.tsx', 'w') as f:
    f.write(content)
