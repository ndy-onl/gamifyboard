import os
import re

hook_path = "excalidraw-app/hooks/useCollaboration.ts"
app_path = "excalidraw-app/App.tsx"

with open(hook_path, "r") as f:
    hook_content = f.read()

# Modify useCollaboration signature
hook_content = hook_content.replace(
    "boardId: string | null,",
    "boardId: string | null,\n  onGameModeChange?: (isEditMode: boolean) => void"
)

# Add gamifyStateRef
ref_code = """
  const bindingRef = useRef<ExcalidrawBinding | null>(null);
  const providerRef = useRef<SocketIOProvider | null>(null);
  const gamifyStateRef = useRef<Y.Map<any> | null>(null);
"""
hook_content = hook_content.replace(
    "  const bindingRef = useRef<ExcalidrawBinding | null>(null);\n  const providerRef = useRef<SocketIOProvider | null>(null);",
    ref_code
)

# Initialize gamifyState
init_code = """
      const ydoc = new Y.Doc();
      
      const gamifyState = ydoc.getMap<any>('gamifyState');
      gamifyStateRef.current = gamifyState;
      
      gamifyState.observe(event => {
         const mode = gamifyState.get('isEditMode');
         if (mode !== undefined && onGameModeChange) {
            onGameModeChange(mode);
         }
      });
"""
hook_content = hook_content.replace("      const ydoc = new Y.Doc();", init_code)

# Add setter
setter_code = """
  const setGlobalGameMode = useCallback((isEditMode: boolean) => {
    if (gamifyStateRef.current) {
       gamifyStateRef.current.set('isEditMode', isEditMode);
    }
  }, []);

  return { isCollaborating, updateBoard, onPointerUpdate, setGlobalGameMode };
"""
hook_content = re.sub(r"return \{ isCollaborating, updateBoard, onPointerUpdate \};", setter_code, hook_content)

with open(hook_path, "w") as f:
    f.write(hook_content)


with open(app_path, "r") as f:
    app_content = f.read()

# Update hook call
app_content = app_content.replace(
    "const { isCollaborating, onPointerUpdate } = useCollaboration(excalidrawAPI, boardId);",
    "const { isCollaborating, onPointerUpdate, setGlobalGameMode } = useCollaboration(excalidrawAPI, boardId, (newMode) => setIsEditMode(newMode));"
)

# Update button click
old_btn = """onClick={() => {
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
new_btn = """onClick={() => {
            const newMode = !isEditMode;
            setGlobalGameMode(newMode);
            setIsEditMode(newMode);
          }}"""
app_content = app_content.replace(old_btn, new_btn)

# Remove onChange loop
onchange_code = """          if (excalidrawAPI) {
            const stateElement = excalidrawAPI.getSceneElements().find(el => el.customData?.globalIsEditMode !== undefined);
            if (stateElement && stateElement.customData?.globalIsEditMode !== undefined) {
               setIsEditMode(prev => {
                  if (prev !== stateElement.customData.globalIsEditMode) return stateElement.customData.globalIsEditMode;
                  return prev;
               });
            }
          }"""
app_content = app_content.replace(onchange_code, "")

with open(app_path, "w") as f:
    f.write(app_content)

print("Game mode updated.")
