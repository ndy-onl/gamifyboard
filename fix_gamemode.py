import re

with open('excalidraw-app/App.tsx', 'r') as f:
    content = f.read()

# 1. Update renderTopRightUI signature and JSX
old_render_ui = """const renderTopRightUI = ({
  collabError,
  isCollabDisabled,
  setShareDialogState,
  isLoggedIn,
  loggedInUiState, // NEU: loggedInUiState akzeptieren
  handleLogout,
  onLoginClick,
  excalidrawAPI,
  isCollaborating,
}: {
  collabError: any;
  isCollabDisabled: boolean;
  setShareDialogState: (state: any) => void;
  isLoggedIn: boolean;
  loggedInUiState: boolean;
  handleLogout: () => void;
  onLoginClick: () => void;
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  isCollaborating: boolean;
}) => {
  return (
    <div style={{ display: "flex", gap: "10px" }}>
      {collabError.message && <CollabError collabError={collabError} />}
      <button
        className="excalidraw-button collab-button"
        onClick={() => setShareDialogState({ isOpen: true, type: "share" })}
        style={{ padding: "8px 16px" }}
      >
        Share
      </button>"""

new_render_ui = """const renderTopRightUI = ({
  collabError,
  isCollabDisabled,
  setShareDialogState,
  isLoggedIn,
  loggedInUiState,
  handleLogout,
  onLoginClick,
  excalidrawAPI,
  isCollaborating,
  isEditMode,
  setIsEditMode,
}: {
  collabError: any;
  isCollabDisabled: boolean;
  setShareDialogState: (state: any) => void;
  isLoggedIn: boolean;
  loggedInUiState: boolean;
  handleLogout: () => void;
  onLoginClick: () => void;
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  isCollaborating: boolean;
  isEditMode: boolean;
  setIsEditMode: (v: boolean) => void;
}) => {
  return (
    <div style={{ display: "flex", gap: "10px" }}>
      {collabError.message && <CollabError collabError={collabError} />}
      <button
        className={`excalidraw-button collab-button ${isEditMode ? '' : 'active'}`}
        onClick={() => setIsEditMode(!isEditMode)}
        style={{ padding: "8px 16px", background: isEditMode ? "transparent" : "#aaffaa", color: isEditMode ? "inherit" : "#000", fontWeight: "bold" }}
      >
        {isEditMode ? "Edit Mode" : "Game Mode!"}
      </button>
      <button
        className="excalidraw-button collab-button"
        onClick={() => setShareDialogState({ isOpen: true, type: "share" })}
        style={{ padding: "8px 16px" }}
      >
        Share
      </button>"""

content = content.replace(old_render_ui, new_render_ui)


# 2. Add isEditMode state to ExcalidrawWrapper and replace handleAction with new one + triggerAction
old_handle_action = """  const handleAction = (action: string) => {
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
          if (typeof (excalidrawAPI as any).scrollToContent === "function") {
            (excalidrawAPI as any).scrollToContent(frame, { animate: true });
          } else if (typeof excalidrawAPI.setViewport === "function") {
            excalidrawAPI.setViewport({ target: [frame], fit: "contain", animation: { duration: 300 }, offsets: { ui: true } });
          } else {
            console.error("No scroll function found on excalidrawAPI");
          }
        } else {
          excalidrawAPI.setToast({ message: "Frame '" + targetFrameName + "' nicht gefunden!", color: "danger" });
        }
      }
    }
  };"""

new_handle_action = """  const [isEditMode, setIsEditMode] = useState(true);

  const triggerAction = (action: string, targetElement: NonDeletedExcalidrawElement) => {
    if (!excalidrawAPI) return;
    const sceneElements = excalidrawAPI.getSceneElements();
    
    if (action === "startTimer") {
      const duration = targetElement.customData?.timerDuration || 300;
      const newSceneElements = sceneElements.map(el => 
        el.id === targetElement.id ? { ...el, customData: { ...el.customData, endTime: Date.now() + duration * 1000, hasFrozen: false }, version: (el.version || 0) + 1 } : el
      );
      excalidrawAPI.updateScene({ elements: newSceneElements as any });
    } else if (action === "teleport") {
      const targetFrameName = targetElement.customData?.targetFrame;
      if (targetFrameName) {
        const frame = sceneElements.find(el => el.type === "frame" && el.name === targetFrameName);
        if (frame) {
          if (typeof (excalidrawAPI as any).scrollToContent === "function") {
            (excalidrawAPI as any).scrollToContent(frame, { animate: true });
          } else if (typeof excalidrawAPI.setViewport === "function") {
            excalidrawAPI.setViewport({ target: [frame], fit: "contain", animation: { duration: 300 }, offsets: { ui: true } });
          }
        } else {
          excalidrawAPI.setToast({ message: "Frame '" + targetFrameName + "' nicht gefunden!", color: "danger" });
        }
      }
    }
  };

  const handleAction = (action: string) => {
    if (!excalidrawAPI || selectedElements.length === 0) return;
    const sceneElements = excalidrawAPI.getSceneElements();
    const element = selectedElements[0];

    if (action === "startTimer") {
      triggerAction("startTimer", element);
    } else if (action === "resetTimer") {
      handleUpdateElement({ endTime: null, hasFrozen: false });
      let newSceneElements = [...sceneElements];
      newSceneElements = newSceneElements.map(el => {
        if (el.customData?.isCard) {
          return { ...el, locked: false, version: (el.version || 0) + 1 };
        }
        return el;
      });
      excalidrawAPI.updateScene({ elements: newSceneElements });
    } else if (action === "teleport") {
      triggerAction("teleport", element);
    }
  };"""

content = content.replace(old_handle_action, new_handle_action)

# 3. Pass isEditMode down to renderTopRightUI and use it in PropertiesSidebar and Excalidraw pointer events
old_ui_options = """          renderCustomUI: (elements, appState, files) => {
            return renderTopRightUI({
              collabError,
              isCollabDisabled,
              setShareDialogState,
              isLoggedIn,
              loggedInUiState, // NEU: loggedInUiState übergeben
              handleLogout,
              onLoginClick,
              excalidrawAPI,
              isCollaborating,
            });
          }}
        }}
        onLinkOpen="""

new_ui_options = """          renderCustomUI: (elements, appState, files) => {
            return renderTopRightUI({
              collabError,
              isCollabDisabled,
              setShareDialogState,
              isLoggedIn,
              loggedInUiState,
              handleLogout,
              onLoginClick,
              excalidrawAPI,
              isCollaborating,
              isEditMode,
              setIsEditMode,
            });
          }}
        }}
        onPointerDown={(activeTool, pointerDownState) => {
          const hitElement = pointerDownState.hit?.element;
          if (hitElement && hitElement.customData && !isEditMode) {
             if (hitElement.customData.isTeleporter) {
                triggerAction("teleport", hitElement as NonDeletedExcalidrawElement);
             } else if (hitElement.customData.isTimer) {
                triggerAction("startTimer", hitElement as NonDeletedExcalidrawElement);
             }
          }
        }}
        onLinkOpen="""

content = content.replace(old_ui_options, new_ui_options)

# 4. Hide properties sidebar if not edit mode
old_sidebar_render = """        {selectedElements.length > 0 && (
          <PropertiesSidebar"""
new_sidebar_render = """        {isEditMode && selectedElements.length > 0 && (
          <PropertiesSidebar"""

content = content.replace(old_sidebar_render, new_sidebar_render)

with open('excalidraw-app/App.tsx', 'w') as f:
    f.write(content)

