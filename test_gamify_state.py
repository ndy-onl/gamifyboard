import re

with open('excalidraw-app/App.tsx', 'r') as f:
    content = f.read()

# Replace setIsEditMode(!isEditMode) with toggleGameMode
old_button = """        <button
          className={`excalidraw-button collab-button ${isEditMode ? '' : 'active'}`}
          onClick={() => setIsEditMode(!isEditMode)}
          style={{ padding: "8px 16px", background: isEditMode ? "transparent" : "#aaffaa", color: isEditMode ? "inherit" : "#000", fontWeight: "bold" }}
        >
          {isEditMode ? "Edit Mode" : "Game Mode!"}
        </button>"""

new_button = """        <button
          className={`excalidraw-button collab-button ${isEditMode ? '' : 'active'}`}
          onClick={() => {
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
                    isDeleted: true,
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
          }}
          style={{ padding: "8px 16px", background: isEditMode ? "transparent" : "#aaffaa", color: isEditMode ? "inherit" : "#000", fontWeight: "bold" }}
        >
          {isEditMode ? "Edit Mode" : "Game Mode!"}
        </button>"""

content = content.replace(old_button, new_button)

# Add read logic to onChange
old_onchange = """        onChange={(elements, appState, files) => {
          onChange(elements, appState, files);
          if ("""

new_onchange = """        onChange={(elements, appState, files) => {
          onChange(elements, appState, files);
          
          if (excalidrawAPI) {
            const stateElement = excalidrawAPI.getSceneElementsIncludingDeleted().find(el => el.id === "GAMIFY_BOARD_STATE");
            if (stateElement && stateElement.customData?.isEditMode !== undefined) {
               if (stateElement.customData.isEditMode !== isEditMode) {
                  setIsEditMode(stateElement.customData.isEditMode);
               }
            }
          }

          if ("""

content = content.replace(old_onchange, new_onchange)

with open('excalidraw-app/App.tsx', 'w') as f:
    f.write(content)
