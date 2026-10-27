import re

with open('excalidraw-app/App.tsx', 'r') as f:
    content = f.read()

# Replace handleUpdateElement block
new_handle_update = """  const handleUpdateElement = (updatedData: any) => {
    if (!excalidrawAPI || selectedElements.length === 0) {
      return;
    }

    const sceneElements = excalidrawAPI.getSceneElements();
    let newSceneElements = [...sceneElements];
    let updatedSelectedElements: any[] = [];
    
    let hasChanges = false;

    for (const selectedElement of selectedElements) {
        const elementIndex = newSceneElements.findIndex((el) => el.id === selectedElement.id);
        if (elementIndex === -1) continue;

        const newCustomData = { ...selectedElement.customData, ...updatedData };

        if (newCustomData.isCounter && selectedElement.type !== "counter") {
          const newElement = {
            ...selectedElement,
            type: "counter" as const,
            customData: { ...newCustomData, value: 0 },
            version: (selectedElement.version || 0) + 1,
          };
          newSceneElements[elementIndex] = newElement as any;
          updatedSelectedElements.push(newElement as any);
          hasChanges = true;
          continue;
        }

        const updatedElement = {
          ...selectedElement,
          customData: newCustomData,
          strokeStyle: (newCustomData.isZone ? "dashed" : "solid") as any,
          version: (selectedElement.version || 0) + 1,
        };

        newSceneElements[elementIndex] = updatedElement as any;
        updatedSelectedElements.push(updatedElement as any);
        hasChanges = true;
    }

    if (hasChanges) {
      excalidrawAPI.updateScene({ elements: newSceneElements });
      setSelectedElements(updatedSelectedElements);
    }
  };

  const handleAction = (action: string) => {
    if (!excalidrawAPI || selectedElements.length === 0) return;
    const sceneElements = excalidrawAPI.getSceneElements();
    let newSceneElements = [...sceneElements];
    const element = selectedElements[0];

    if (action === "startTimer") {
      const duration = element.customData?.timerDuration || 300;
      handleUpdateElement({ endTime: Date.now() + duration * 1000, hasFrozen: false });
    } else if (action === "resetTimer") {
      handleUpdateElement({ endTime: null, hasFrozen: false });
      // Unlock all cards
      newSceneElements = newSceneElements.map(el => {
        if (el.customData?.isCard) {
          return { ...el, locked: false, version: (el.version || 0) + 1 };
        }
        return el;
      });
      excalidrawAPI.updateScene({ elements: newSceneElements });
    } else if (action === "teleport") {
      const targetFrameName = element.customData?.targetFrame;
      if (targetFrameName) {
        const frame = sceneElements.find(el => el.type === "frame" && el.name === targetFrameName);
        if (frame) {
          excalidrawAPI.scrollToContent(frame, { animate: true });
        } else {
          excalidrawAPI.setToast({ message: "Frame '" + targetFrameName + "' nicht gefunden!", color: "danger" });
        }
      }
    }
  };
"""

# Find the start and end of the old handleUpdateElement
start_idx = content.find("const handleUpdateElement = (updatedData: any) => {")
# It ends right before `const renderCustomStats =`
end_idx = content.find("const renderCustomStats =", start_idx)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_handle_update + "\n  " + content[end_idx:]
else:
    print("Could not find handleUpdateElement block")

with open('excalidraw-app/App.tsx', 'w') as f:
    f.write(content)
