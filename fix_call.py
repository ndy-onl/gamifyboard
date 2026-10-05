import re

with open('excalidraw-app/App.tsx', 'r') as f:
    content = f.read()

old_call = """            loggedInUiState, // NEU: loggedInUiState übergeben
            handleLogout,
            onLoginClick,
            excalidrawAPI,
            isCollaborating,
          });"""

new_call = """            loggedInUiState, // NEU: loggedInUiState übergeben
            handleLogout,
            onLoginClick,
            excalidrawAPI,
            isCollaborating,
            isEditMode,
            setIsEditMode,
          });"""

content = content.replace(old_call, new_call)

with open('excalidraw-app/App.tsx', 'w') as f:
    f.write(content)
