import re

with open('excalidraw-app/App.tsx', 'r') as f:
    content = f.read()

# 1. Replace selectedElement state with selectedElements
content = re.sub(
    r'const \[selectedElement, setSelectedElement\] =\s*useState<NonDeletedExcalidrawElement \| null>\(null\);',
    r'const [selectedElements, setSelectedElements] = useState<NonDeletedExcalidrawElement[]>([]);',
    content
)

# 2. Update onChange selection logic
old_selection_logic = """          if (
            appState.selectedElementIds &&
            Object.keys(appState.selectedElementIds).length === 1
          ) {
            const selectedId = Object.keys(appState.selectedElementIds)[0];
            const element = elements.find((el) => el.id === selectedId);
            if (element) {
              setSelectedElement(element as NonDeletedExcalidrawElement);
            } else {
              setSelectedElement(null);
            }
          } else {
            setSelectedElement(null);
          }"""

new_selection_logic = """          if (
            appState.selectedElementIds &&
            Object.keys(appState.selectedElementIds).length > 0
          ) {
            const selectedIds = Object.keys(appState.selectedElementIds);
            const els = elements.filter((el) => selectedIds.includes(el.id));
            setSelectedElements(els as NonDeletedExcalidrawElement[]);
          } else {
            setSelectedElements([]);
          }"""

content = content.replace(old_selection_logic, new_selection_logic)

# 3. Update handleUpdateElement and add handleAction
old_handle_update = """  const handleUpdateElement = (updatedData: any) => {
    if (!excalidrawAPI || !selectedElement) {
      return;
    }

    const sceneElements = excalidrawAPI.getSceneElements();
    const elementIndex = sceneElements.findIndex(
      (el) => el.id === selectedElement.id,
    );
    if (elementIndex === -1) {
      return;
    }

    const newCustomData = { ...selectedElement.customData, ...updatedData };

    if (newCustomData.isCounter && selectedElement.type !== "counter") {
      const newElement = {
        ...selectedElement,
        type: "counter" as const,
        customData: { ...newCustomData, value: 0 },
        version: (selectedElement.version || 0) + 1,
      };

      const newSceneElements = [
        ...sceneElements.slice(0, elementIndex),
        newElement,
        ...sceneElements.slice(elementIndex + 1),
      ];
      excalidrawAPI.updateScene({ elements: newSceneElements });
      setSelectedElement(newElement as NonDeletedExcalidrawElement);
      return;
    }

    const updatedElement = {
      ...selectedElement,
      customData: newCustomData,
      strokeStyle: (newCustomData.isZone ? "dashed" : "solid") as any,
      backgroundColor: selectedElement.backgroundColor,
      version: (selectedElement.version || 0) + 1,
    };

    const newSceneElements = [
      ...sceneElements.slice(0, elementIndex),
      updatedElement,
      ...sceneElements.slice(elementIndex + 1),
    ];

    excalidrawAPI.updateScene({ elements: newSceneElements });
    setSelectedElement(updatedElement as NonDeletedExcalidrawElement);
  };"""

new_handle_update = """  const handleUpdateElement = (updatedData: any) => {
    if (!excalidrawAPI || selectedElements.length === 0) {
      return;
    }

    const sceneElements = excalidrawAPI.getSceneElements();
    let newSceneElements = [...sceneElements];
    let updatedSelectedElements: NonDeletedExcalidrawElement[] = [];
    
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

content = content.replace(old_handle_update, new_handle_update)

# 4. Render PropertiesSidebar correctly
old_sidebar_render = """        {selectedElement && (
          <PropertiesSidebar
            element={selectedElement}
            onUpdate={handleUpdateElement}
          />
        )}"""

new_sidebar_render = """        {selectedElements.length > 0 && (
          <PropertiesSidebar
            elements={selectedElements}
            onUpdate={handleUpdateElement}
            onAction={handleAction}
          />
        )}"""

content = content.replace(old_sidebar_render, new_sidebar_render)

with open('excalidraw-app/App.tsx', 'w') as f:
    f.write(content)
