import re

with open('excalidraw-app/App.tsx', 'r') as f:
    content = f.read()

# 1. Replace renderTopRightUI
start_idx = content.find("const renderTopRightUI = ({")
end_idx = content.find("      <div style={{ display: \"flex\", gap: \"10px\" }}>", start_idx)

if start_idx != -1 and end_idx != -1:
    old_top_right = content[start_idx:end_idx]
    
    new_top_right = """const renderTopRightUI = ({
  isMobile,
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
  isMobile?: boolean;
  collabError: any;
  isCollabDisabled: boolean;
  setShareDialogState: (state: any) => void;
  isLoggedIn: boolean;
  loggedInUiState: boolean;
  handleLogout: () => void;
  onLoginClick: () => void;
  excalidrawAPI: any;
  isCollaborating: boolean;
  isEditMode?: boolean;
  setIsEditMode?: (v: boolean) => void;
}) => {
  return (
    <div style={{ display: "flex", gap: "10px" }}>
      {setIsEditMode && (
        <button
          className={`excalidraw-button collab-button ${isEditMode ? '' : 'active'}`}
          onClick={() => setIsEditMode(!isEditMode)}
          style={{ padding: "8px 16px", background: isEditMode ? "transparent" : "#aaffaa", color: isEditMode ? "inherit" : "#000", fontWeight: "bold" }}
        >
          {isEditMode ? "Edit Mode" : "Game Mode!"}
        </button>
      )}
"""
    
    content = content[:start_idx] + new_top_right + content[end_idx + len("    <div style={{ display: \"flex\", gap: \"10px\" }}>"):]

# 2. Add isEditMode state to ExcalidrawWrapper and replace handleAction
start_action_idx = content.find("  const handleAction = (action: string) => {")
end_action_idx = content.find("  const renderCustomStats = (", start_action_idx)

if start_action_idx != -1 and end_action_idx != -1:
    new_action = """  const [isEditMode, setIsEditMode] = useState(true);

  const triggerAction = (action: string, targetElement: any) => {
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
      excalidrawAPI.updateScene({ elements: newSceneElements as any });
    } else if (action === "teleport") {
      triggerAction("teleport", element);
    }
  };
"""
    content = content[:start_action_idx] + new_action + content[end_action_idx:]

# 3. Inject isEditMode into renderCustomUI and PropertiesSidebar
# We need to find `renderTopRightUI({` inside `renderCustomUI`
content = content.replace(
    "loggedInUiState, // NEU: loggedInUiState übergeben",
    "loggedInUiState,\n            isEditMode,\n            setIsEditMode,"
)

content = content.replace(
    """        {selectedElements.length > 0 && (
          <PropertiesSidebar""",
    """        {isEditMode && selectedElements.length > 0 && (
          <PropertiesSidebar"""
)

# 4. Inject pointerDown interception
pointer_down_hook = """        onPointerDown={(activeTool, pointerDownState) => {
          const hitElement = pointerDownState.hit?.element;
          if (hitElement && hitElement.customData && !isEditMode) {
             if (hitElement.customData.isTeleporter) {
                triggerAction("teleport", hitElement);
             } else if (hitElement.customData.isTimer) {
                triggerAction("startTimer", hitElement);
             }
          }
        }}
        onLinkOpen="""

content = content.replace("        onLinkOpen=", pointer_down_hook)

with open('excalidraw-app/App.tsx', 'w') as f:
    f.write(content)

