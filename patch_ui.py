import re

with open('excalidraw-app/App.tsx', 'r') as f:
    content = f.read()

# 1. Fix renderTopRightUI signature and add button
sig_pattern = r'const renderTopRightUI = \(\{\n  isMobile,\n  collabError,\n  isCollabDisabled,\n  setShareDialogState,\n  isLoggedIn,\n  loggedInUiState,(.*?)\n\}\) => \{'
sig_match = re.search(sig_pattern, content, re.DOTALL)
if sig_match:
    old_sig = sig_match.group(0)
    new_sig = """const renderTopRightUI = ({
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
}: any) => {"""
    content = content.replace(old_sig, new_sig)

# Add the button
button_pattern = r'<button\n        className="excalidraw-button collab-button"\n        onClick=\{\(\) => setShareDialogState\(\{ isOpen: true, type: "share" \}\)\}\n        style=\{\{ padding: "8px 16px" \}\}\n      >\n        Share\n      </button>'
button_match = re.search(button_pattern, content)
if button_match:
    old_button = button_match.group(0)
    new_button = """      {setIsEditMode && (
        <button
          className={`excalidraw-button collab-button ${isEditMode ? '' : 'active'}`}
          onClick={() => setIsEditMode(!isEditMode)}
          style={{ padding: "8px 16px", background: isEditMode ? "transparent" : "#aaffaa", color: isEditMode ? "inherit" : "#000", fontWeight: "bold" }}
        >
          {isEditMode ? "Edit Mode" : "Game Mode!"}
        </button>
      )}
      <button
        className="excalidraw-button collab-button"
        onClick={() => setShareDialogState({ isOpen: true, type: "share" })}
        style={{ padding: "8px 16px" }}
      >
        Share
      </button>"""
    content = content.replace(old_button, new_button)

# 2. Update renderCustomUI call inside App.tsx
call_pattern = r'loggedInUiState, // NEU: loggedInUiState übergeben\n              handleLogout,\n              onLoginClick,\n              excalidrawAPI,\n              isCollaborating,\n            \}\);'
call_match = re.search(call_pattern, content)
if call_match:
    old_call = call_match.group(0)
    new_call = """loggedInUiState, // NEU: loggedInUiState übergeben
              handleLogout,
              onLoginClick,
              excalidrawAPI,
              isCollaborating,
              isEditMode,
              setIsEditMode,
            });"""
    content = content.replace(old_call, new_call)

# 3. Add onPointerDown to <Excalidraw>
# We can inject it right after `onChange={` which is safe.
onchange_pattern = r'onChange=\{\(elements, appState, files\) => \{'
onchange_match = re.search(onchange_pattern, content)
if onchange_match:
    old_onchange = onchange_match.group(0)
    new_onchange = """onPointerDown={(activeTool, pointerDownState) => {
          const hitElement = pointerDownState.hit?.element;
          if (hitElement && hitElement.customData && !isEditMode) {
             if (hitElement.customData.isTeleporter) {
                triggerAction("teleport", hitElement as NonDeletedExcalidrawElement);
             } else if (hitElement.customData.isTimer) {
                triggerAction("startTimer", hitElement as NonDeletedExcalidrawElement);
             }
          }
        }}
        onChange={(elements, appState, files) => {"""
    content = content.replace(old_onchange, new_onchange)

with open('excalidraw-app/App.tsx', 'w') as f:
    f.write(content)
